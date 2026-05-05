/**
 * PromoEndJob:
 *   - 每分钟扫 merchant_promotion 表 status=active AND end_time<=NOW
 *   - TX:把 productIds 中每个 product.price=original_price, original_price=NULL;status=ended
 * 周期:每分钟。
 */
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThanOrEqual, Repository } from 'typeorm';

import { MerchantPromotion, Product } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

@Injectable()
export class PromoEndJob extends BaseJob {
  readonly name = 'promo-end';
  protected override lockTtlMs = 60_000;

  constructor(
    @InjectRepository(MerchantPromotion) private readonly promoRepo: Repository<MerchantPromotion>,
    @InjectDataSource() private readonly dataSource: DataSource,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'promo-end' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = String(Date.now());
    const candidates = await this.promoRepo.find({
      where: { status: 'active', endTime: LessThanOrEqual(now) },
      take: 50,
    });
    if (candidates.length === 0) {
      this.logger.debug('no active promos to end');
      return;
    }
    let ended = 0;
    for (const promo of candidates) {
      try {
        await this.dataSource.transaction(async (em) => {
          const pRepo = em.getRepository(Product);
          const prRepo = em.getRepository(MerchantPromotion);

          if (promo.promoType === 'time_limited') {
            const products = await pRepo.find({ where: { productId: In(promo.productIds) } });
            for (const p of products) {
              if (p.originalPrice) {
                await pRepo.update(
                  { productId: p.productId },
                  {
                    price: p.originalPrice,
                    originalPrice: null,
                    updatedAt: String(Date.now()),
                  },
                );
              }
            }
          }
          await prRepo.update({ promoId: promo.promoId }, { status: 'ended', updatedAt: String(Date.now()) });
        });
        ended++;
      } catch (err) {
        this.logger.warn({ err, promoId: promo.promoId }, 'promo-end TX failed');
      }
    }
    this.logger.log(`promo-end: ${ended} promotions ended`);
  }
}
