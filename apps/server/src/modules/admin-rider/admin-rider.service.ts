import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { plainToInstance } from 'class-transformer';
import { Brackets, Repository } from 'typeorm';

import {
  FileObject,
  RiderAccount,
  RiderApplication,
  type RiderAuditStatus,
  RiderAuditLog,
  RiderCertificate,
  RiderServiceArea,
  RiderStatus,
  RiderVehicle,
} from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import {
  AuditRiderDto,
  AuditRiderVo,
  ListRidersQueryDto,
  RiderDetailVo,
  RiderListItemVo,
  RiderListPageVo,
  UpdateRiderStatusDto,
  UpdateServiceAreaDto,
} from './admin-rider.dto';

function isValidGeoJsonPolygon(g: unknown): boolean {
  if (!g || typeof g !== 'object') return false;
  const obj = g as { type?: string; coordinates?: unknown };
  if (obj.type !== 'Polygon') return false;
  if (!Array.isArray(obj.coordinates)) return false;
  // 允许空 coordinates([])占位
  if (obj.coordinates.length === 0) return true;
  // 一组环 + 至少 4 点 + 首尾闭合
  for (const ring of obj.coordinates) {
    if (!Array.isArray(ring) || ring.length < 4) return false;
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (!Array.isArray(first) || !Array.isArray(last)) return false;
    if (first[0] !== last[0] || first[1] !== last[1]) return false;
  }
  return true;
}

@Injectable()
export class AdminRiderService {
  constructor(
    @InjectRepository(RiderAccount) private readonly riderRepo: Repository<RiderAccount>,
    @InjectRepository(RiderApplication) private readonly appRepo: Repository<RiderApplication>,
    @InjectRepository(RiderCertificate) private readonly certRepo: Repository<RiderCertificate>,
    @InjectRepository(RiderVehicle) private readonly vehicleRepo: Repository<RiderVehicle>,
    @InjectRepository(RiderStatus) private readonly statusRepo: Repository<RiderStatus>,
    @InjectRepository(RiderServiceArea) private readonly areaRepo: Repository<RiderServiceArea>,
    @InjectRepository(RiderAuditLog) private readonly auditLogRepo: Repository<RiderAuditLog>,
    @InjectRepository(FileObject) private readonly fileRepo: Repository<FileObject>,
    private readonly eventBus: DomainEventBus,
  ) {}

  async list(query: ListRidersQueryDto): Promise<RiderListPageVo> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.appRepo.createQueryBuilder('a');
    if (query.auditStatus) qb.andWhere('a.audit_status = :s', { s: query.auditStatus });
    if (query.keyword) {
      const kw = query.keyword.trim();
      qb.andWhere(
        new Brackets((sub) =>
          sub
            .where('a.real_name LIKE :kw', { kw: `%${kw}%` })
            .orWhere('a.mobile LIKE :kw', { kw: `%${kw}%` })
            .orWhere('a.id_card_no LIKE :kw', { kw: `%${kw}%` }),
        ),
      );
    }
    qb.orderBy('a.submitted_at', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    const list = rows.map((a) =>
      plainToInstance(
        RiderListItemVo,
        {
          applicationId: a.applicationId,
          riderId: a.riderId,
          mobile: a.mobile,
          realName: a.realName,
          idCardNo: a.idCardNo,
          auditStatus: a.auditStatus,
          submittedAt: a.submittedAt,
        },
        { excludeExtraneousValues: true },
      ),
    );
    return { pageNo, pageSize, total, list };
  }

  async getDetail(applicationId: string): Promise<RiderDetailVo> {
    const app = await this.appRepo.findOne({ where: { applicationId } });
    if (!app) throw new NotFoundException('application not found');

    const rider = app.riderId
      ? await this.riderRepo.findOne({ where: { riderId: app.riderId } })
      : await this.riderRepo.findOne({ where: { mobile: app.mobile } });
    const certs = await this.certRepo.find({ where: { applicationId } });
    const vehicle = rider ? await this.vehicleRepo.findOne({ where: { riderId: rider.riderId } }) : null;
    const status = rider ? await this.statusRepo.findOne({ where: { riderId: rider.riderId } }) : null;

    const fileIds = certs.map((c) => c.fileObjectId);
    const files = fileIds.length ? await this.fileRepo.find({ where: fileIds.map((fid) => ({ fileId: fid })) }) : [];
    const fileMap = new Map(files.map((f) => [f.fileId, f.url]));
    const certVoList = certs.map((c) => ({
      certType: c.certType,
      fileId: c.fileObjectId,
      url: fileMap.get(c.fileObjectId) ?? null,
    }));

    return plainToInstance(
      RiderDetailVo,
      {
        applicationId: app.applicationId,
        riderId: app.riderId,
        mobile: app.mobile,
        realName: app.realName,
        idCardNo: app.idCardNo,
        healthCertNo: app.healthCertNo,
        healthCertExpiry: app.healthCertExpiry,
        auditStatus: app.auditStatus,
        rejectReason: app.rejectReason,
        accountStatus: rider?.accountStatus,
        onlineStatus: status?.onlineStatus,
        vehicleType: vehicle?.vehicleType,
        plateNo: vehicle?.plateNo,
        certificates: certVoList,
        submittedAt: app.submittedAt,
      },
      { excludeExtraneousValues: true },
    );
  }

  async audit(applicationId: string, operatorId: string, dto: AuditRiderDto): Promise<AuditRiderVo> {
    const app = await this.appRepo.findOne({ where: { applicationId } });
    if (!app) throw new NotFoundException('application not found');

    const targetStatus = dto.auditResult as RiderAuditStatus;
    // 幂等:已是目标态 → 不重发事件
    if (app.auditStatus === targetStatus) {
      return {
        riderId: app.riderId,
        applicationId: app.applicationId,
        auditStatus: app.auditStatus,
      };
    }

    const now = String(Date.now());
    const patch: Partial<RiderApplication> = {
      auditStatus: targetStatus,
      auditedAt: now,
      auditedBy: operatorId,
      updatedAt: now,
    };
    if (dto.auditResult === 'rejected') {
      patch.rejectReason = dto.rejectReason ?? '资质不符';
    }

    await this.appRepo.update({ applicationId }, patch);

    // 写审计日志
    await this.auditLogRepo.insert({
      riderId: app.riderId,
      applicationId,
      eventType: dto.auditResult,
      operatorType: 'admin',
      operatorId,
      detail: { rejectReason: dto.rejectReason },
      createdAt: now,
    });

    if (dto.auditResult === 'approved') {
      await this.eventBus.publish(
        EventName.RiderApproved,
        {
          applicationId,
          riderId: app.riderId ?? '',
          approvedAt: Number(now),
          auditedBy: operatorId,
        },
        { bizType: 'rider', bizId: app.riderId ?? applicationId },
      );
    }

    return {
      riderId: app.riderId,
      applicationId,
      auditStatus: targetStatus,
    };
  }

  async updateStatus(
    riderId: string,
    operatorId: string,
    dto: UpdateRiderStatusDto,
  ): Promise<{ riderId: string; accountStatus: string }> {
    const rider = await this.riderRepo.findOne({ where: { riderId } });
    if (!rider) throw new NotFoundException('rider not found');

    const targetAccountStatus = dto.targetStatus === 'enabled' ? 'active' : 'disabled';
    if (rider.accountStatus === targetAccountStatus) {
      return { riderId, accountStatus: targetAccountStatus };
    }

    const now = String(Date.now());
    await this.riderRepo.update({ riderId }, { accountStatus: targetAccountStatus, updatedAt: now });

    if (dto.targetStatus === 'disabled') {
      // 强制下线
      const status = await this.statusRepo.findOne({ where: { riderId } });
      if (status && status.onlineStatus === 'online') {
        await this.statusRepo.update({ statusId: status.statusId }, { onlineStatus: 'offline', updatedAt: now });
        await this.eventBus.publish(
          EventName.RiderOffline,
          { riderId, reason: 'admin-disabled' },
          { bizType: 'rider', bizId: riderId },
        );
      }
    }

    await this.auditLogRepo.insert({
      riderId,
      applicationId: null,
      eventType: dto.targetStatus,
      operatorType: 'admin',
      operatorId,
      detail: { reason: dto.reason },
      createdAt: now,
    });

    return { riderId, accountStatus: targetAccountStatus };
  }

  async updateServiceArea(
    riderId: string,
    operatorId: string,
    dto: UpdateServiceAreaDto,
  ): Promise<{ riderId: string; updated: boolean }> {
    if (!isValidGeoJsonPolygon(dto.geometry)) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        message: 'geometry 必须是合法 GeoJSON Polygon(首尾闭合 + ≥4 点)',
      });
    }
    const rider = await this.riderRepo.findOne({ where: { riderId } });
    if (!rider) throw new NotFoundException('rider not found');

    const now = String(Date.now());
    const existing = await this.areaRepo.findOne({ where: { riderId } });
    if (existing) {
      await this.areaRepo.update(
        { serviceAreaId: existing.serviceAreaId },
        {
          geometry: dto.geometry,
          maxConcurrentOrders: dto.maxConcurrentOrders ?? existing.maxConcurrentOrders,
          updatedAt: now,
        },
      );
    } else {
      await this.areaRepo.insert({
        riderId,
        geometry: dto.geometry,
        maxConcurrentOrders: dto.maxConcurrentOrders ?? 3,
        createdAt: now,
        updatedAt: now,
      });
    }
    void operatorId;
    return { riderId, updated: true };
  }
}
