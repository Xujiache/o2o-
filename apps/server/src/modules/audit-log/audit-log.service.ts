import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import type { Model } from 'mongoose';
import { Repository } from 'typeorm';

import { SysAuditLog } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import { AuditLogDetail, type AuditLogDetailDocument } from './schemas/audit-log-detail.schema';

export interface WriteAuditInput {
  traceId: string;
  operatorType: string;
  operatorId?: string | null;
  targetType: string;
  targetId?: string | null;
  beforeStatus?: string | null;
  afterStatus?: string | null;
  ip?: string | null;
  deviceId?: string | null;
  summary?: string | null;
  request?: Record<string, unknown>;
  response?: unknown;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(SysAuditLog) private readonly repo: Repository<SysAuditLog>,
    @InjectModel(AuditLogDetail.name) private readonly detailModel: Model<AuditLogDetailDocument>,
    private readonly eventBus: DomainEventBus,
  ) {}

  async writeAudit(input: WriteAuditInput): Promise<void> {
    const now = Date.now().toString();
    let detailRef: string | null = null;

    if (input.request || input.response) {
      try {
        const detail = await this.detailModel.create({
          traceId: input.traceId,
          request: input.request,
          response: input.response,
          createdAt: Date.now(),
        });
        detailRef = String(detail._id);
      } catch (err) {
        this.logger.error({ err, traceId: input.traceId }, 'audit detail write failed');
      }
    }

    try {
      const result = await this.repo.insert({
        traceId: input.traceId,
        operatorType: input.operatorType,
        operatorId: input.operatorId ?? null,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        beforeStatus: input.beforeStatus ?? null,
        afterStatus: input.afterStatus ?? null,
        ip: input.ip ?? null,
        deviceId: input.deviceId ?? null,
        summary: input.summary ?? null,
        detailRef,
        createdAt: now,
      });
      const auditLogId = String(result.identifiers[0]?.id ?? '');
      // T24 — 发布 AuditLogCreated 事件(非阻塞;DomainEventBus 内部捕获订阅器异常)
      void this.eventBus
        .publish(
          EventName.AuditLogCreated,
          {
            auditLogId,
            traceId: input.traceId,
            targetType: input.targetType,
            targetId: input.targetId ?? null,
          },
          { bizType: EventName.AuditLogCreated, bizId: auditLogId },
        )
        .catch((err) => this.logger.error({ err }, 'audit-log-created event publish failed'));
    } catch (err) {
      this.logger.error({ err, traceId: input.traceId }, 'audit log write failed');
    }
  }
}
