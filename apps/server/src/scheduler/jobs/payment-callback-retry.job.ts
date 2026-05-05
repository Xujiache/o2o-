import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { PaymentOrder } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const RETRY_DELAY_MS = 2 * 60 * 1000;
const MAX_RETRY = 3;
const SCAN_LIMIT = 100;

/**
 * 支付回调补偿:扫 pending payment_order 超过 2 min 未收到回调,主动 query 第三方(本阶段仅 log)。
 * 真接 stage 8(IntegrationGatewayService.queryPayStatus)。
 */
@Injectable()
export class PaymentCallbackRetryJob extends BaseJob {
  readonly name = 'payment-callback-retry';
  protected override lockTtlMs = 60_000;

  constructor(
    @InjectRepository(PaymentOrder) private readonly payRepo: Repository<PaymentOrder>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 */1 * * * *', { name: 'payment-callback-retry' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const cutoff = String(Date.now() - RETRY_DELAY_MS);
    const pending = await this.payRepo.find({
      where: { status: 'pending', createdAt: LessThan(cutoff) },
      take: SCAN_LIMIT,
    });
    if (!pending.length) {
      this.logger.debug('[payment-callback-retry] no pending payments due');
      return;
    }
    let retried = 0;
    let dropped = 0;
    for (const p of pending) {
      if (p.retryCount >= MAX_RETRY) {
        dropped++;
        this.logger.warn(`[payment-callback-retry] payOrderNo=${p.payOrderNo} retry max reached, mark expired`);
        await this.payRepo.update(
          { paymentOrderId: p.paymentOrderId },
          { status: 'expired', updatedAt: String(Date.now()) },
        );
        continue;
      }
      // stage 5 mock:仅 +retryCount + log;stage 8 真主动查询第三方
      retried++;
      await this.payRepo.update(
        { paymentOrderId: p.paymentOrderId },
        { retryCount: p.retryCount + 1, updatedAt: String(Date.now()) },
      );
      this.logger.log(`[payment-callback-retry] payOrderNo=${p.payOrderNo} retry=${p.retryCount + 1}/${MAX_RETRY}`);
    }
    this.logger.log(`[payment-callback-retry] retried=${retried} dropped=${dropped}`);
  }
}
