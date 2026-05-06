import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import { RiderEarning, RiderTask, SysConfig } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

interface EarningFormula {
  baseFood: number;
  baseErrand: number;
  perKmCents: number;
  timelyBonus: number;
}

const DEFAULT_FORMULA: EarningFormula = { baseFood: 500, baseErrand: 300, perKmCents: 50, timelyBonus: 200 };

/**
 * Stage 8 — T+1 骑手收益日结。每日 02:30 跑一次。
 *  - 聚合前一日 DELIVERED rider_task,按 rider 维度求和
 *  - 收益 = baseFood/baseErrand × bizType + timelyBonus(简化:无 LATE 违规即得)+ perKmCents 距离补贴(简化:本阶段不计算距离,设 0)
 *  - 唯一索引 (rider_id, settle_date) 兜底重复跑
 *  - emit RiderEarningGenerated
 */
@Injectable()
export class RiderEarningDailySettleJob extends BaseJob {
  readonly name = 'rider-earning-daily-settle';
  protected override lockTtlMs = 60 * 60_000;

  constructor(
    @InjectRepository(RiderEarning) private readonly earningRepo: Repository<RiderEarning>,
    @InjectRepository(RiderTask) private readonly taskRepo: Repository<RiderTask>,
    @InjectRepository(SysConfig) private readonly sysConfigRepo: Repository<SysConfig>,
    private readonly eventBus: DomainEventBus,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 30 2 * * *', { name: 'rider-earning-daily-settle' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const formula = await this.getFormula();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const periodStart = yesterday.getTime();
    const periodEnd = today.getTime() - 1;
    const settleDate = Number(
      `${yesterday.getFullYear()}${(yesterday.getMonth() + 1).toString().padStart(2, '0')}${yesterday.getDate().toString().padStart(2, '0')}`,
    );

    const tasks = await this.taskRepo.find({
      where: { status: 'DELIVERED', deliveredAt: Between(String(periodStart), String(periodEnd)) },
    });
    if (!tasks.length) {
      this.logger.log('[rider-earning-daily-settle] no DELIVERED tasks');
      return;
    }

    const byRider = new Map<string, RiderTask[]>();
    for (const t of tasks) {
      const arr = byRider.get(t.riderId) ?? [];
      arr.push(t);
      byRider.set(t.riderId, arr);
    }

    const now = Date.now();
    for (const [riderId, list] of byRider.entries()) {
      const existing = await this.earningRepo.findOne({ where: { riderId, settleDate } });
      if (existing) {
        this.logger.debug(`[rider-earning-daily-settle] earning ${riderId}/${settleDate} exists, skip`);
        continue;
      }

      let baseAmount = 0n;
      let timelyBonus = 0n;
      const orderCount = list.length;
      for (const t of list) {
        baseAmount += BigInt(t.bizType === 'FOOD' ? formula.baseFood : formula.baseErrand);
        timelyBonus += BigInt(formula.timelyBonus);
      }
      const distanceAmount = 0n;
      const totalAmount = baseAmount + distanceAmount + timelyBonus;

      try {
        const inserted = await this.earningRepo.save(
          this.earningRepo.create({
            riderId,
            settleDate,
            orderCount,
            baseAmount: baseAmount.toString(),
            distanceAmount: distanceAmount.toString(),
            timelyBonus: timelyBonus.toString(),
            rewardAmount: '0',
            deductAmount: '0',
            totalAmount: totalAmount.toString(),
            status: 'PENDING',
            settledAt: String(now),
            createdAt: String(now),
            updatedAt: String(now),
          }),
        );
        await this.eventBus.publish(
          EventName.RiderEarningGenerated,
          {
            riderEarningId: inserted.riderEarningId,
            riderId,
            settleDate,
            totalAmount: totalAmount.toString(),
            generatedAt: now,
          },
          { bizType: 'rider-earning', bizId: inserted.riderEarningId },
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[rider-earning-daily-settle] failed rider=${riderId}: ${msg}`);
      }
    }
  }

  private async getFormula(): Promise<EarningFormula> {
    const cfg = await this.sysConfigRepo.findOne({ where: { configKey: 'rider.earning.formula' } });
    if (!cfg) return DEFAULT_FORMULA;
    try {
      const parsed = JSON.parse(cfg.configValue) as Partial<EarningFormula>;
      return {
        baseFood: Number(parsed.baseFood ?? DEFAULT_FORMULA.baseFood),
        baseErrand: Number(parsed.baseErrand ?? DEFAULT_FORMULA.baseErrand),
        perKmCents: Number(parsed.perKmCents ?? DEFAULT_FORMULA.perKmCents),
        timelyBonus: Number(parsed.timelyBonus ?? DEFAULT_FORMULA.timelyBonus),
      };
    } catch {
      return DEFAULT_FORMULA;
    }
  }
}
