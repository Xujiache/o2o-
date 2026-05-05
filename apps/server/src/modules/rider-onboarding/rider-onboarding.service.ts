import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { DataSource, EntityManager, Repository } from 'typeorm';

import {
  FileObject,
  IntegrationRequestLog,
  RiderAccount,
  RiderApplication,
  type RiderAuditStatus,
  RiderAuditLog,
  RiderCertificate,
  type RiderCertType,
  RiderVehicle,
} from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';

import { RiderOnboardingStatusVo, SubmitRiderApplicationDto, SubmitRiderApplicationVo } from './rider-onboarding.dto';

const REQUIRED_CERT_TYPES: RiderCertType[] = [
  'id_card_front',
  'id_card_back',
  'face_video',
  'health_cert',
  'driver_license',
];

@Injectable()
export class RiderOnboardingService {
  private readonly logger = new Logger(RiderOnboardingService.name);

  constructor(
    @InjectRepository(RiderAccount) private readonly riderRepo: Repository<RiderAccount>,
    @InjectRepository(RiderApplication) private readonly appRepo: Repository<RiderApplication>,
    @InjectRepository(RiderCertificate) private readonly certRepo: Repository<RiderCertificate>,
    @InjectRepository(RiderVehicle) private readonly vehicleRepo: Repository<RiderVehicle>,
    @InjectRepository(RiderAuditLog) private readonly auditLogRepo: Repository<RiderAuditLog>,
    @InjectRepository(FileObject) private readonly fileRepo: Repository<FileObject>,
    @InjectRepository(IntegrationRequestLog) private readonly logRepo: Repository<IntegrationRequestLog>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly gateway: IntegrationGatewayService,
    private readonly eventBus: DomainEventBus,
  ) {}

  async submit(riderId: string, dto: SubmitRiderApplicationDto): Promise<SubmitRiderApplicationVo> {
    const rider = await this.riderRepo.findOne({ where: { riderId } });
    if (!rider) {
      throw new NotFoundException('rider not found');
    }
    if (rider.accountStatus === 'disabled') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '账号已被禁用,请联系平台',
      });
    }

    // 校验 5 种 cert_type 全部存在
    const providedTypes = new Set(dto.certificates.map((c) => c.certType));
    for (const t of REQUIRED_CERT_TYPES) {
      if (!providedTypes.has(t)) {
        throw new UnprocessableEntityException({
          code: ErrorCode.INVALID_PARAM,
          message: `缺少资质类型: ${t}`,
        });
      }
    }

    // 校验所有 file_object_id 存在
    const fileIds = dto.certificates.map((c) => c.fileObjectId);
    const files = await this.fileRepo.find({ where: fileIds.map((fileId) => ({ fileId })) });
    if (files.length !== fileIds.length) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '部分资质文件未找到',
      });
    }

    // 重提规则:已 pending 的不可重复提交
    const latest = await this.appRepo.findOne({
      where: { mobile: rider.mobile },
      order: { submittedAt: 'DESC' },
    });
    if (latest && latest.auditStatus === 'pending') {
      throw new UnprocessableEntityException({
        code: ErrorCode.DUPLICATE_REQUEST,
        message: '已有待审核申请,请耐心等待',
      });
    }

    const result = await this.dataSource.transaction(async (em: EntityManager) => {
      const appRepo = em.getRepository(RiderApplication);
      const certRepo = em.getRepository(RiderCertificate);
      const vehicleRepo = em.getRepository(RiderVehicle);
      const auditRepo = em.getRepository(RiderAuditLog);
      const now = String(Date.now());

      // 1. 申请记录
      const app = await appRepo.save(
        appRepo.create({
          riderId: rider.riderId,
          mobile: rider.mobile,
          realName: dto.realName,
          idCardNo: dto.idCardNo,
          healthCertNo: dto.healthCertNo,
          healthCertExpiry: String(dto.healthCertExpiry),
          auditStatus: 'pending' as RiderAuditStatus,
          rejectReason: null,
          auditedAt: null,
          auditedBy: null,
          submittedAt: now,
          createdAt: now,
          updatedAt: now,
        }),
      );

      // 2. 证件 N 行
      for (const c of dto.certificates) {
        await certRepo.insert({
          applicationId: app.applicationId,
          certType: c.certType,
          fileObjectId: c.fileObjectId,
          extra: null,
          createdAt: now,
        });
      }

      // 3. 车辆(同 rider 已存在则 UPDATE,否则 INSERT)
      const existingVehicle = await vehicleRepo.findOne({ where: { riderId: rider.riderId } });
      if (existingVehicle) {
        await vehicleRepo.update(
          { vehicleId: existingVehicle.vehicleId },
          {
            vehicleType: dto.vehicle.vehicleType,
            plateNo: dto.vehicle.plateNo ?? null,
            brand: dto.vehicle.brand ?? null,
            updatedAt: now,
          },
        );
      } else {
        await vehicleRepo.insert({
          riderId: rider.riderId,
          vehicleType: dto.vehicle.vehicleType,
          plateNo: dto.vehicle.plateNo ?? null,
          brand: dto.vehicle.brand ?? null,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });
      }

      // 4. 审计日志
      await auditRepo.insert({
        riderId: rider.riderId,
        applicationId: app.applicationId,
        eventType: 'submitted',
        operatorType: 'rider',
        operatorId: rider.riderId,
        detail: { realName: '*', mobile: rider.mobile },
        createdAt: now,
      });

      return { app };
    });

    // 5. 异步:第三方 mock verifyFace(不阻塞主流程)
    const faceCert = dto.certificates.find((c) => c.certType === 'face_video');
    if (faceCert) {
      void this.tryVerifyFace(result.app.applicationId, {
        idCardNo: dto.idCardNo,
        realName: dto.realName,
        faceFileId: faceCert.fileObjectId,
      });
    }

    // 6. 发布事件
    await this.eventBus.publish(
      EventName.RiderSubmitted,
      {
        applicationId: result.app.applicationId,
        riderId: rider.riderId,
        mobile: rider.mobile,
        submittedAt: Number(result.app.submittedAt),
      },
      { bizType: 'rider', bizId: rider.riderId },
    );

    return {
      applicationId: result.app.applicationId,
      auditStatus: result.app.auditStatus,
      submittedAt: Number(result.app.submittedAt),
    };
  }

  async getStatus(riderId: string): Promise<RiderOnboardingStatusVo> {
    const rider = await this.riderRepo.findOne({ where: { riderId } });
    if (!rider) {
      throw new NotFoundException('rider not found');
    }
    const latest = await this.appRepo.findOne({
      where: { mobile: rider.mobile },
      order: { submittedAt: 'DESC' },
    });
    if (!latest) {
      return {
        hasApplication: false,
        canResubmit: true,
      } as RiderOnboardingStatusVo;
    }
    return {
      hasApplication: true,
      applicationId: latest.applicationId,
      auditStatus: latest.auditStatus,
      rejectReason: latest.rejectReason,
      canResubmit: latest.auditStatus === 'rejected',
      submittedAt: latest.submittedAt,
      realName: rider.realName ?? latest.realName,
    } as RiderOnboardingStatusVo;
  }

  private async tryVerifyFace(
    applicationId: string,
    opts: { idCardNo: string; realName: string; faceFileId: string },
  ): Promise<void> {
    const requestId = `face-${applicationId}-${Date.now()}`;
    try {
      const r = await this.gateway.realname.verifyFace(opts);
      await this.writeLog(
        'ali-realname',
        r.providerRequestId,
        'realname.verifyFace',
        { applicationId, idCardNo: '***', faceFileId: opts.faceFileId },
        r,
        r.success ? 'success' : 'failed',
      );
      if (!r.success) {
        const now = String(Date.now());
        await this.auditLogRepo.insert({
          riderId: null,
          applicationId,
          eventType: 'submitted',
          operatorType: 'system',
          operatorId: null,
          detail: { verifyFace: 'failed', reason: r.reason },
          createdAt: now,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn({ err }, `[onboarding] verifyFace failed: ${message}`);
      await this.writeLog(
        'ali-realname',
        requestId,
        'realname.verifyFace',
        { applicationId },
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
      await this.logRepo.insert({
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
      this.logger.warn({ err }, `[onboarding] integration log write failed`);
    }
  }
}
