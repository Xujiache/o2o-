import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import { FoodOrder, MerchantSettlement, Store, SysConfig } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const DEFAULT_COMMISSION_BP = 500; // 5%
const DEFAULT_PAYMENT_FEE_BP = 60; // 0.6%

/**
 * Stage 7 — T+1 商家结算 job。
 * 每日 02:00 跑一次:聚合前一日所有 COMPLETED 订单,按店生成 merchant_settlement 行,emit 事件。
 * 佣金率/支付通道费率从 sys_config 读取。重复跑由 settlement_no 唯一索引兜底。
 */
@Injectable()
export class T1MerchantSettlementJob extends BaseJob {
  readonly name = 't1-merchant-settlement';
  protected override lockTtlMs = 60 * 60 * 1000;

  constructor(
    @InjectRepository(MerchantSettlement)
    private readonly settlementRepo: Repository<MerchantSettlement>,
    @InjectRepository(FoodOrder) private readonly orderRepo: Repository<FoodOrder>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(SysConfig) private readonly sysConfigRepo: Repository<SysConfig>,
    private readonly eventBus: DomainEventBus,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 0 2 * * *', { name: 't1-merchant-settlement' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const periodStart = yesterday.getTime();
    const periodEnd = today.getTime() - 1;

    const commissionBp = await this.readBpConfig('merchant.commission.rate', DEFAULT_COMMISSION_BP);
    const paymentFeeBp = await this.readBpConfig('merchant.payment.fee_rate', DEFAULT_PAYMENT_FEE_BP);

    const orders = await this.orderRepo.find({
      where: {
        status: 'COMPLETED',
        completedAt: Between(String(periodStart), String(periodEnd)),
      },
    });
    if (!orders.length) {
      this.logger.log('[t1-merchant-settlement] no completed orders to settle');
      return;
    }

    const byStore = new Map<string, FoodOrder[]>();
    for (const o of orders) {
      const arr = byStore.get(o.storeId) ?? [];
      arr.push(o);
      byStore.set(o.storeId, arr);
    }

    const periodTag = `${yesterday.getFullYear()}${(yesterday.getMonth() + 1).toString().padStart(2, '0')}${yesterday.getDate().toString().padStart(2, '0')}`;
    for (const [storeId, storeOrders] of byStore.entries()) {
      const store = await this.storeRepo.findOne({ where: { storeId } });
      if (!store) continue;

      let gross = 0n;
      let refund = 0n;
      let refundCount = 0;
      for (const o of storeOrders) {
        gross += BigInt(o.payableAmount);
        if (o.payStatus === 'refunded') {
          refund += BigInt(o.payableAmount);
          refundCount += 1;
        }
      }
      const net0 = gross - refund;
      const commission = (net0 * BigInt(commissionBp)) / 10000n;
      const fee = (net0 * BigInt(paymentFeeBp)) / 10000n;
      const net = net0 - commission - fee;

      const now = Date.now();
      const settlementNo = `S${periodTag}${storeId.padStart(8, '0')}`;
      const existing = await this.settlementRepo.findOne({ where: { settlementNo } });
      if (existing) {
        this.logger.debug(`[t1-merchant-settlement] settlement ${settlementNo} already exists, skip`);
        continue;
      }

      try {
        const inserted = await this.settlementRepo.save(
          this.settlementRepo.create({
            settlementNo,
            merchantId: store.merchantId,
            storeId,
            periodStart: String(periodStart),
            periodEnd: String(periodEnd),
            grossCents: gross.toString(),
            commissionCents: commission.toString(),
            feeCents: fee.toString(),
            netCents: net.toString(),
            orderCount: storeOrders.length,
            refundCount,
            status: 'PENDING',
            createdAt: String(now),
            updatedAt: String(now),
          }),
        );
        await this.eventBus.publish(
          EventName.MerchantSettlementGenerated,
          {
            settlementId: inserted.merchantSettlementId,
            storeId,
            merchantId: store.merchantId,
            periodStart,
            periodEnd,
            netCents: net.toString(),
            generatedAt: now,
          },
          { bizType: 'merchant-settlement', bizId: inserted.merchantSettlementId },
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[t1-merchant-settlement] failed storeId=${storeId}: ${msg}`);
      }
    }
  }

  private async readBpConfig(key: string, fallback: number): Promise<number> {
    const cfg = await this.sysConfigRepo.findOne({ where: { configKey: key } });
    if (!cfg) return fallback;
    try {
      const parsed = JSON.parse(cfg.configValue) as { food?: number };
      if (typeof parsed === 'object' && parsed && typeof parsed.food === 'number') return parsed.food;
    } catch {
      // not JSON
    }
    const n = Number(cfg.configValue);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }
}
