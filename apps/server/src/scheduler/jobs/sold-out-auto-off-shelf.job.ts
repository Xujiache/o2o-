/**
 * SoldOutAutoOffShelfJob:
 *   - 每 5 分钟扫 product 表 stock=0 AND sale_status='on_shelf'
 *   - 自动改 sale_status='sold_out'(stock.adjust 主流程已置位,本任务为兜底)
 * 周期:每 5 分钟。
 */
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

@Injectable()
export class SoldOutAutoOffShelfJob extends BaseJob {
  readonly name = 'sold-out-auto-off-shelf';
  protected override lockTtlMs = 5 * 60_000;

  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'sold-out-auto-off-shelf' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const r = await this.productRepo
      .createQueryBuilder()
      .update(Product)
      .set({ saleStatus: 'sold_out', updatedAt: String(Date.now()) })
      .where('stock = 0 AND sale_status = :s', { s: 'on_shelf' })
      .execute();
    if ((r.affected ?? 0) > 0) {
      this.logger.log(`sold-out auto off-shelf: ${r.affected} products updated`);
    }
  }
}
