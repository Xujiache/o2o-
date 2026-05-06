import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { In, Repository } from 'typeorm';

import { DispatchTask, RiderStatus, SysConfig } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

const DEFAULT_TIMEOUT_SECONDS = 30;

export interface DispatchInput {
  bizType: 'FOOD' | 'ERRAND';
  bizOrderId: string;
  bizTaskId?: string | null;
  cityCode?: string;
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    @InjectRepository(DispatchTask) private readonly dispatchRepo: Repository<DispatchTask>,
    @InjectRepository(RiderStatus) private readonly riderStatusRepo: Repository<RiderStatus>,
    @InjectRepository(SysConfig) private readonly sysConfigRepo: Repository<SysConfig>,
    private readonly eventBus: DomainEventBus,
  ) {}

  private async getTimeoutMs(): Promise<number> {
    const cfg = await this.sysConfigRepo.findOne({ where: { configKey: 'dispatch.timeout_seconds' } });
    const seconds = cfg ? Number(cfg.configValue) : DEFAULT_TIMEOUT_SECONDS;
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : DEFAULT_TIMEOUT_SECONDS * 1000;
  }

  /**
   * 派单入口:为 (bizType, bizOrderId) 创建 dispatch_task。
   *  - 扫描所有在线骑手作为候选(简化算法,P3 接智能调度)
   *  - 候选为空仍创 PENDING dispatch_task(由 dispatch-timeout-retry job 重试)
   *  - 幂等:同 bizType+bizOrderId 已有 PENDING/DISPATCHED dispatch_task 直接返回
   */
  async dispatch(input: DispatchInput): Promise<DispatchTask> {
    const existing = await this.dispatchRepo.findOne({
      where: { bizType: input.bizType, bizOrderId: input.bizOrderId, status: In(['PENDING', 'DISPATCHED']) },
    });
    if (existing) return existing;

    const onlineRiders = await this.riderStatusRepo.find({
      where: { onlineStatus: 'online' },
      take: 50,
    });
    const candidateIds = onlineRiders.map((r) => r.riderId);

    const now = Date.now();
    const timeoutMs = await this.getTimeoutMs();
    const inserted = await this.dispatchRepo.save(
      this.dispatchRepo.create({
        bizType: input.bizType,
        bizOrderId: input.bizOrderId,
        bizTaskId: input.bizTaskId ?? null,
        candidateRiderIds: candidateIds,
        acceptedRiderId: null,
        status: 'PENDING',
        retryCount: 0,
        dispatchedAt: String(now),
        timeoutAt: String(now + timeoutMs),
        createdAt: String(now),
        updatedAt: String(now),
      }),
    );

    await this.eventBus.publish(
      EventName.DispatchStarted,
      {
        dispatchTaskId: inserted.dispatchTaskId,
        bizType: input.bizType,
        bizOrderId: input.bizOrderId,
        bizTaskId: input.bizTaskId ?? null,
        candidateRiderIds: candidateIds,
        dispatchedAt: now,
      },
      { bizType: 'dispatch-task', bizId: inserted.dispatchTaskId },
    );

    this.logger.log(
      `[dispatch] created dispatchTaskId=${inserted.dispatchTaskId} bizType=${input.bizType} candidates=${candidateIds.length}`,
    );
    return inserted;
  }

  async findById(dispatchTaskId: string): Promise<DispatchTask> {
    const t = await this.dispatchRepo.findOne({ where: { dispatchTaskId } });
    if (!t) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'dispatch task not found' });
    }
    return t;
  }

  async markDispatched(dispatchTaskId: string, riderId: string): Promise<void> {
    const now = Date.now();
    await this.dispatchRepo.update(
      { dispatchTaskId },
      { status: 'DISPATCHED', acceptedRiderId: riderId, completedAt: String(now), updatedAt: String(now) },
    );
  }

  async markTimeout(dispatchTaskId: string): Promise<void> {
    const now = Date.now();
    await this.dispatchRepo.update({ dispatchTaskId }, { status: 'TIMEOUT', updatedAt: String(now) });
  }
}
