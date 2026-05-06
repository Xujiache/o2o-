import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RefundOrder } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

/**
 * Stage 9 — 对账任务。每日 03:30 检查 refund_order 状态一致性。
 * 简化:统计昨日 refund_order 状态分布(打日志),不实际调用支付通道对账。
 * P3 登记 stage 11 接 wxpay 对账下载文件。
 */
@Injectable()
export class ReconciliationJob extends BaseJob {
  readonly name = 'reconciliation';
  protected override lockTtlMs = 30 * 60_000;

  constructor(
    @InjectRepository(RefundOrder) private readonly refundRepo: Repository<RefundOrder>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 30 3 * * *', { name: 'reconciliation' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const yesterdayStart = this.yesterdayStart();
    const todayStart = this.todayStart();
    const cnt = await this.refundRepo
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.created_at >= :from AND r.created_at < :to', { from: String(yesterdayStart), to: String(todayStart) })
      .groupBy('r.status')
      .getRawMany();
    this.logger.log(`[reconciliation] yesterday refund stats: ${JSON.stringify(cnt)}`);
  }

  private todayStart(): number {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  private yesterdayStart(): number {
    return this.todayStart() - 86400000;
  }
}
