/**
 * StockAlertScanJob:
 *   - 每 30 分钟扫 product 表 stock < stock_alert_threshold 且 sale_status='on_shelf' 的商品
 *   - 发 domain.stock.low 事件(订阅器占位 push 通知)
 * 周期:每 30 分钟。
 */
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Raw, Repository } from 'typeorm';

import { Product } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

@Injectable()
export class StockAlertScanJob extends BaseJob {
  readonly name = 'stock-alert-scan';
  protected override lockTtlMs = 5 * 60_000;

  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    private readonly eventBus: DomainEventBus,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_30_MINUTES, { name: 'stock-alert-scan' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const products = await this.productRepo.find({
      where: {
        saleStatus: 'on_shelf',
        stock: Raw((alias) => `${alias} < COALESCE(stock_alert_threshold, 5) AND ${alias} > 0`),
      },
      take: 500,
    });
    if (products.length === 0) {
      this.logger.debug('no low-stock products');
      return;
    }
    let published = 0;
    for (const p of products) {
      try {
        await this.eventBus.publish(
          EventName.StockLow,
          {
            productId: p.productId,
            storeId: p.storeId,
            currentStock: p.stock,
            threshold: p.stockAlertThreshold ?? 5,
          },
          { bizType: 'stock', bizId: p.productId },
        );
        published++;
      } catch (err) {
        this.logger.warn({ err, productId: p.productId }, 'stock-low publish failed');
      }
    }
    this.logger.log(`stock alert scan: ${published} low-stock events published`);
  }
}
