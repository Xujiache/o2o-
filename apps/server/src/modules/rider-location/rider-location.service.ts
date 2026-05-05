import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { DataSource, EntityManager, Repository } from 'typeorm';

import {
  IntegrationRequestLog,
  RiderAccount,
  RiderApplication,
  RiderAuditLog,
  RiderLocation,
  RiderStatus,
} from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';

import { LocationBatchDto, LocationBatchVo, UpdateOnlineStatusDto, UpdateOnlineStatusVo } from './rider-location.dto';

@Injectable()
export class RiderLocationService {
  private readonly logger = new Logger(RiderLocationService.name);

  constructor(
    @InjectRepository(RiderAccount) private readonly riderRepo: Repository<RiderAccount>,
    @InjectRepository(RiderApplication) private readonly appRepo: Repository<RiderApplication>,
    @InjectRepository(RiderStatus) private readonly statusRepo: Repository<RiderStatus>,
    @InjectRepository(RiderLocation) private readonly locationRepo: Repository<RiderLocation>,
    @InjectRepository(RiderAuditLog) private readonly auditLogRepo: Repository<RiderAuditLog>,
    @InjectRepository(IntegrationRequestLog) private readonly integLogRepo: Repository<IntegrationRequestLog>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly gateway: IntegrationGatewayService,
    private readonly eventBus: DomainEventBus,
  ) {}

  async updateOnlineStatus(riderId: string, dto: UpdateOnlineStatusDto): Promise<UpdateOnlineStatusVo> {
    const rider = await this.riderRepo.findOne({ where: { riderId } });
    if (!rider) throw new NotFoundException('rider not found');

    if (dto.targetStatus === 'online') {
      // 校验:approved + healthCert valid + active
      if (rider.accountStatus !== 'active') {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          message: '账号已被禁用,无法上线',
        });
      }
      const latestApp = await this.appRepo.findOne({
        where: { mobile: rider.mobile },
        order: { submittedAt: 'DESC' },
      });
      if (!latestApp || latestApp.auditStatus !== 'approved') {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          message: '入驻审核未通过,无法上线',
        });
      }
      if (rider.healthCertExpiry && Number(rider.healthCertExpiry) < Date.now()) {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          message: '健康证已过期,无法上线',
        });
      }
    }

    const status = await this.statusRepo.findOne({ where: { riderId } });
    if (!status) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '骑手状态记录未初始化(请先完成入驻审核)',
      });
    }

    const now = String(Date.now());
    if (dto.targetStatus === 'online') {
      // 调 push.bindDevice mock(失败 warn 不阻塞)
      if (dto.deviceToken && dto.platform) {
        void this.tryBindDevice(riderId, dto.deviceToken, dto.platform);
      }
      await this.statusRepo.update(
        { statusId: status.statusId },
        {
          onlineStatus: 'online',
          currentLng: dto.currentLng ? String(dto.currentLng) : status.currentLng,
          currentLat: dto.currentLat ? String(dto.currentLat) : status.currentLat,
          lastHeartbeatAt: now,
          deviceToken: dto.deviceToken ?? status.deviceToken,
          platform: dto.platform ?? status.platform,
          updatedAt: now,
        },
      );
      await this.auditLogRepo.insert({
        riderId,
        applicationId: null,
        eventType: 'online',
        operatorType: 'rider',
        operatorId: riderId,
        detail: { lng: dto.currentLng, lat: dto.currentLat },
        createdAt: now,
      });
      await this.eventBus.publish(
        EventName.RiderOnline,
        {
          riderId,
          deviceToken: dto.deviceToken,
          platform: dto.platform,
          lng: dto.currentLng,
          lat: dto.currentLat,
        },
        { bizType: 'rider', bizId: riderId },
      );
      return { riderStatus: 'online', canAcceptOrder: true };
    }

    // offline
    await this.statusRepo.update({ statusId: status.statusId }, { onlineStatus: 'offline', updatedAt: now });
    await this.auditLogRepo.insert({
      riderId,
      applicationId: null,
      eventType: 'offline',
      operatorType: 'rider',
      operatorId: riderId,
      detail: { reason: 'rider-action' },
      createdAt: now,
    });
    await this.eventBus.publish(
      EventName.RiderOffline,
      { riderId, reason: 'rider-action' },
      { bizType: 'rider', bizId: riderId },
    );
    return { riderStatus: 'offline', canAcceptOrder: false, reason: 'rider-offline' };
  }

  async batchReport(riderId: string, dto: LocationBatchDto): Promise<LocationBatchVo> {
    if (dto.points.length === 0 || dto.points.length > 50) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        message: 'points 数量必须在 1~50 之间',
      });
    }
    const status = await this.statusRepo.findOne({ where: { riderId } });
    if (!status) {
      throw new NotFoundException('rider status not found (please complete onboarding)');
    }

    const now = String(Date.now());
    const lastPoint = dto.points[dto.points.length - 1];
    if (!lastPoint) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        message: 'points 不能为空',
      });
    }

    await this.dataSource.transaction(async (em: EntityManager) => {
      const locRepo = em.getRepository(RiderLocation);
      for (const p of dto.points) {
        await locRepo.insert({
          riderId,
          lng: String(p.lng),
          lat: String(p.lat),
          accuracy: p.accuracy ?? null,
          batchId: dto.batchId,
          reportedAt: String(p.reportedAt),
          createdAt: now,
        });
      }
      const statusRepo = em.getRepository(RiderStatus);
      await statusRepo.update(
        { statusId: status.statusId },
        {
          currentLng: String(lastPoint.lng),
          currentLat: String(lastPoint.lat),
          lastHeartbeatAt: now,
          updatedAt: now,
        },
      );
    });

    await this.eventBus.publish(
      EventName.RiderLocationUpdated,
      {
        riderId,
        batchId: dto.batchId,
        batchSize: dto.points.length,
        lastLng: lastPoint.lng,
        lastLat: lastPoint.lat,
        lastReportedAt: lastPoint.reportedAt,
      },
      { bizType: 'rider', bizId: riderId },
    );

    return { acceptedCount: dto.points.length, serverTime: Date.now() };
  }

  private async tryBindDevice(riderId: string, deviceToken: string, platform: 'android' | 'ios'): Promise<void> {
    try {
      const r = await this.gateway.getui.bindDevice({ riderId, deviceToken, platform });
      await this.writeLog('getui', r.providerRequestId, 'getui.bindDevice', { riderId, platform }, r, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn({ err }, `[location] bindDevice failed: ${message}`);
      await this.writeLog(
        'getui',
        `bind-fail-${Date.now()}`,
        'getui.bindDevice',
        { riderId, platform },
        { error: message },
        'failed',
      );
    }
  }

  private async writeLog(
    provider: string,
    requestId: string,
    endpoint: string,
    requestPayload: unknown,
    responsePayload: unknown,
    status: 'success' | 'failed',
  ): Promise<void> {
    const now = String(Date.now());
    try {
      await this.integLogRepo.insert({
        provider,
        requestId,
        endpoint,
        requestPayload: JSON.stringify(requestPayload),
        responsePayload: JSON.stringify(responsePayload),
        status,
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      this.logger.warn({ err }, `[location] integration log write failed`);
    }
  }
}
