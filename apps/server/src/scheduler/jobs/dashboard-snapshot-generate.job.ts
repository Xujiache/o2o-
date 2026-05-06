import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DashboardSnapshot, ErrandOrder, FoodOrder, RiderStatus, RiskExceptionLog } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

/**
 * Stage 9 — 数据大屏快照生成。每日 00:30 写 dashboard_snapshot(cityCode='ALL')。
 */
@Injectable()
export class DashboardSnapshotGenerateJob extends BaseJob {
  readonly name = 'dashboard-snapshot-generate';
  protected override lockTtlMs = 30 * 60_000;

  constructor(
    @InjectRepository(DashboardSnapshot) private readonly snapshotRepo: Repository<DashboardSnapshot>,
    @InjectRepository(FoodOrder) private readonly foodRepo: Repository<FoodOrder>,
    @InjectRepository(ErrandOrder) private readonly errandRepo: Repository<ErrandOrder>,
    @InjectRepository(RiderStatus) private readonly riderStatusRepo: Repository<RiderStatus>,
    @InjectRepository(RiskExceptionLog) private readonly riskRepo: Repository<RiskExceptionLog>,
    private readonly eventBus: DomainEventBus,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 30 0 * * *', { name: 'dashboard-snapshot-generate' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const today = this.todayKey();
    const cityCode = 'ALL';
    const exists = await this.snapshotRepo.findOne({ where: { snapshotDate: today, cityCode } });
    if (exists) return;
    const orderCount = (await this.foodRepo.count()) + (await this.errandRepo.count());
    const onlineRiders = await this.riderStatusRepo.count({ where: { onlineStatus: 'online' } });
    const exceptionOrders = await this.riskRepo.count({ where: { status: 'OPEN' } });
    await this.snapshotRepo.insert({
      snapshotDate: today,
      cityCode,
      gmv: '0',
      orderCount,
      activeUsers: 0,
      onlineRiders,
      exceptionOrders,
      createdAt: String(Date.now()),
    });
    await this.eventBus.publish(
      EventName.ReportGenerated,
      { snapshotDate: today, cityCode, generatedAt: Date.now() },
      { bizType: 'dashboard', bizId: today },
    );
  }

  private todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
