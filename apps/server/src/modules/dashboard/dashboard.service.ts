import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DashboardSnapshot, ErrandOrder, FoodOrder, RiderStatus, RiskExceptionLog } from '../../database/entities';

import type { DashboardOverviewQueryDto, DashboardOverviewVo } from './dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(DashboardSnapshot) private readonly snapshotRepo: Repository<DashboardSnapshot>,
    @InjectRepository(FoodOrder) private readonly foodRepo: Repository<FoodOrder>,
    @InjectRepository(ErrandOrder) private readonly errandRepo: Repository<ErrandOrder>,
    @InjectRepository(RiderStatus) private readonly riderStatusRepo: Repository<RiderStatus>,
    @InjectRepository(RiskExceptionLog) private readonly riskRepo: Repository<RiskExceptionLog>,
  ) {}

  async overview(q: DashboardOverviewQueryDto): Promise<DashboardOverviewVo> {
    // 优先读今日 snapshot(若存在),否则实时聚合
    const today = this.todayKey();
    const cityCode = q.cityCode ?? 'ALL';
    const snap = await this.snapshotRepo.findOne({ where: { snapshotDate: today, cityCode } });
    if (snap) {
      return {
        gmv: snap.gmv,
        orderCount: snap.orderCount,
        activeUsers: snap.activeUsers,
        onlineRiders: snap.onlineRiders,
        exceptionOrders: snap.exceptionOrders,
      };
    }
    return this.realtimeAggregate(q);
  }

  private async realtimeAggregate(_q: DashboardOverviewQueryDto): Promise<DashboardOverviewVo> {
    const orderCount = (await this.foodRepo.count()) + (await this.errandRepo.count());
    const onlineRiders = await this.riderStatusRepo.count({ where: { onlineStatus: 'online' } });
    const exceptionOrders = await this.riskRepo.count({ where: { status: 'OPEN' } });
    return {
      gmv: '0',
      orderCount,
      activeUsers: 0,
      onlineRiders,
      exceptionOrders,
    };
  }

  private todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
