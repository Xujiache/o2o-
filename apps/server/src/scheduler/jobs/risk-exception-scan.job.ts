import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, Repository } from 'typeorm';

import { FoodOrder, RiskExceptionLog } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const DELIVERY_TIMEOUT_MS = 60 * 60 * 1000; // 配送中超过 1 小时视为异常
const SCAN_LIMIT = 200;

/**
 * Stage 9 — 异常订单扫描。每 5min 扫:配送中超过 1h 的 food_order,
 * 写 risk_exception_log。
 */
@Injectable()
export class RiskExceptionScanJob extends BaseJob {
  readonly name = 'risk-exception-scan';
  protected override lockTtlMs = 5 * 60_000;

  constructor(
    @InjectRepository(FoodOrder) private readonly foodRepo: Repository<FoodOrder>,
    @InjectRepository(RiskExceptionLog) private readonly riskRepo: Repository<RiskExceptionLog>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 */5 * * * *', { name: 'risk-exception-scan' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const cutoff = Date.now() - DELIVERY_TIMEOUT_MS;
    const stuck = await this.foodRepo.find({
      where: { status: 'DELIVERING', updatedAt: LessThan(String(cutoff)) },
      take: SCAN_LIMIT,
    });
    for (const o of stuck) {
      const exists = await this.riskRepo.findOne({
        where: { exceptionType: 'DELIVERY_TIMEOUT', bizOrderId: o.foodOrderId, status: Not('IGNORED' as const) },
      });
      if (exists) continue;
      await this.riskRepo.insert({
        exceptionType: 'DELIVERY_TIMEOUT',
        bizType: 'FOOD',
        bizOrderId: o.foodOrderId,
        severity: 'HIGH',
        description: `订单 ${o.foodOrderId} 配送中超时(>1h)`,
        status: 'OPEN',
        handlerAdminId: null,
        handledAt: null,
        createdAt: String(Date.now()),
      });
    }
  }
}
