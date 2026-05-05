/**
 * PromoStartJob:
 *   - 每分钟扫 merchant_promotion 表 status=scheduled AND start_time<=NOW
 *   - TX:把 productIds 中每个 product.original_price=price, price=折扣价;status=active
 * 周期:每分钟。
 */
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThanOrEqual, Repository } from 'typeorm';

import { MerchantPromotion, Product, type SingleFullOffRules, type TimeLimitedRules } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

@Injectable()
export class PromoStartJob extends BaseJob {
  readonly name = 'promo-start';
  protected override lockTtlMs = 60_000;

  constructor(
    @InjectRepository(MerchantPromotion) private readonly promoRepo: Repository<MerchantPromotion>,
    @InjectDataSource() private readonly dataSource: DataSource,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'promo-start' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = String(Date.now());
    const candidates = await this.promoRepo.find({
      where: { status: 'scheduled', startTime: LessThanOrEqual(now) },
      take: 50,
    });
    if (candidates.length === 0) {
      this.logger.debug('no scheduled promos to start');
      return;
    }
    let started = 0;
    for (const promo of candidates) {
      try {
        await this.dataSource.transaction(async (em) => {
          const pRepo = em.getRepository(Product);
          const prRepo = em.getRepository(MerchantPromotion);

          if (promo.promoType === 'time_limited') {
            const products = await pRepo.find({ where: { productId: In(promo.productIds) } });
            const rules = promo.rules as TimeLimitedRules;
            for (const p of products) {
              const original = Number(p.price);
              const discounted = computeDiscountedPrice(original, rules);
              await pRepo.update(
                { productId: p.productId },
                {
                  originalPrice: String(original),
                  price: String(discounted),
                  updatedAt: String(Date.now()),
                },
              );
            }
          }
          // single_full_off 类型不改 product.price,下单时计算
          await prRepo.update({ promoId: promo.promoId }, { status: 'active', updatedAt: String(Date.now()) });
        });
        started++;
      } catch (err) {
        this.logger.warn({ err, promoId: promo.promoId }, 'promo-start TX failed');
      }
    }
    this.logger.log(`promo-start: ${started} promotions activated`);
  }
}

function computeDiscountedPrice(original: number, rules: TimeLimitedRules): number {
  if (rules.discountType === 'percent') {
    // discountValue 是折扣率(remaining %),如 80 表示"打八折,付原价 80%"
    return Math.max(0, Math.round((original * rules.discountValue) / 100));
  }
  // fixed:discountValue 是直接立减的金额(分)
  return Math.max(0, original - rules.discountValue);
}

// 抑制 unused import 警告
const _typeGuard: SingleFullOffRules | null = null;
void _typeGuard;
