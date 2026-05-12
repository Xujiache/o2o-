import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { CouponRule, UserCoupon } from '../../database/entities';

export interface CouponDiscountResult {
  userCouponId: string;
  couponRuleId: string;
  couponName: string;
  discountCents: bigint;
}

import type {
  AvailableCouponItemVo,
  AvailableCouponsListVo,
  AvailableCouponsQueryDto,
  ClaimCouponVo,
  MyCouponItemVo,
  MyCouponsListVo,
  MyCouponsQueryDto,
} from './coupon-customer.dto';

/**
 * c 端优惠券服务:可领列表 / 领取 / 我的列表。
 *
 * 与现有 `CouponService`(订单链路 lock/release/consume)职责分离;两者最终都依赖 `coupon_rule`。
 * 关键不变式:
 *  - 单用户对同一 couponRuleId 限领 1 张(`uk_user_coupon_customer_rule` 唯一索引保证)
 *  - 库存不超卖:claim 用 `UPDATE ... WHERE remain_stock > 0` 原子扣减,行数 0 即 STOCK_DEPLETED
 *  - EXPIRED 是运行时态:不写离线 job,查询时按 valid_to < now 实时计算
 */
@Injectable()
export class CouponCustomerService {
  constructor(
    @InjectRepository(CouponRule) private readonly ruleRepo: Repository<CouponRule>,
    @InjectRepository(UserCoupon) private readonly userCouponRepo: Repository<UserCoupon>,
    private readonly dataSource: DataSource,
  ) {}

  async listAvailable(customerId: string, q: AvailableCouponsQueryDto): Promise<AvailableCouponsListVo> {
    const pageNo = Math.max(1, q.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, q.pageSize ?? 20));
    const now = Date.now();

    const qb = this.ruleRepo
      .createQueryBuilder('r')
      .where('r.status = :status', { status: 'ACTIVE' })
      .andWhere('r.remainStock > 0')
      .andWhere('r.validFrom <= :now', { now: String(now) })
      .andWhere('r.validTo > :now', { now: String(now) });
    if (q.bizType) qb.andWhere('r.bizType = :bizType', { bizType: q.bizType });

    const [rules, total] = await qb
      .orderBy('r.createdAt', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    let claimedSet = new Set<string>();
    if (rules.length > 0) {
      const claimed = await this.userCouponRepo.find({
        where: { customerId, couponRuleId: In(rules.map((r) => r.couponRuleId)) },
        select: ['couponRuleId'],
      });
      claimedSet = new Set(claimed.map((c) => c.couponRuleId));
    }

    const items: AvailableCouponItemVo[] = rules.map((r) => ({
      couponRuleId: r.couponRuleId,
      couponName: r.couponName,
      couponType: r.couponType,
      bizType: r.bizType,
      threshold: r.threshold,
      discount: r.discount,
      remainStock: r.remainStock,
      validFrom: Number(r.validFrom),
      validTo: Number(r.validTo),
      alreadyClaimed: claimedSet.has(r.couponRuleId),
    }));

    return { items, total, pageNo, pageSize };
  }

  async claim(customerId: string, couponRuleId: string): Promise<ClaimCouponVo> {
    const now = Date.now();
    return this.dataSource.transaction(async (em: EntityManager) => {
      const rule = await em.getRepository(CouponRule).findOne({ where: { couponRuleId } });
      if (!rule) {
        throw new UnprocessableEntityException({
          code: ErrorCode.INVALID_PARAM,
          detail: 'COUPON_NOT_AVAILABLE',
          message: '优惠券不存在',
        });
      }
      if (rule.status !== 'ACTIVE' || Number(rule.validFrom) > now || Number(rule.validTo) <= now) {
        throw new UnprocessableEntityException({
          code: ErrorCode.INVALID_PARAM,
          detail: 'COUPON_NOT_AVAILABLE',
          message: '该优惠券不可领取',
        });
      }

      // 用户级幂等:已领直接拒
      const existed = await em.getRepository(UserCoupon).findOne({
        where: { customerId, couponRuleId },
      });
      if (existed) {
        throw new UnprocessableEntityException({
          code: ErrorCode.INVALID_PARAM,
          detail: 'ALREADY_CLAIMED',
          message: '您已领取过该优惠券',
        });
      }

      // 原子扣减库存
      const dec = await em
        .getRepository(CouponRule)
        .createQueryBuilder()
        .update()
        .set({ remainStock: () => 'remain_stock - 1', updatedAt: String(now) })
        .where('coupon_rule_id = :id AND remain_stock > 0', { id: couponRuleId })
        .execute();
      if ((dec.affected ?? 0) === 0) {
        throw new UnprocessableEntityException({
          code: ErrorCode.INVALID_PARAM,
          detail: 'STOCK_DEPLETED',
          message: '优惠券已被抢光',
        });
      }

      const inserted = await em.getRepository(UserCoupon).save(
        em.getRepository(UserCoupon).create({
          customerId,
          couponRuleId,
          status: 'UNUSED',
          receivedAt: String(now),
        }),
      );
      return { userCouponId: inserted.userCouponId, couponRuleId };
    });
  }

  async listMy(customerId: string, q: MyCouponsQueryDto): Promise<MyCouponsListVo> {
    const pageNo = Math.max(1, q.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, q.pageSize ?? 20));
    const now = Date.now();

    const qb = this.userCouponRepo
      .createQueryBuilder('uc')
      .innerJoin(CouponRule, 'r', 'r.coupon_rule_id = uc.coupon_rule_id')
      .where('uc.customer_id = :customerId', { customerId });

    // 按 status 过滤:EXPIRED 用运行时条件,其他直接匹配 db status
    if (q.status === 'EXPIRED') {
      qb.andWhere('uc.status = :s', { s: 'UNUSED' }).andWhere('r.valid_to <= :now', { now: String(now) });
    } else if (q.status === 'UNUSED') {
      qb.andWhere('uc.status = :s', { s: 'UNUSED' }).andWhere('r.valid_to > :now', { now: String(now) });
    } else if (q.status === 'USED') {
      qb.andWhere('uc.status = :s', { s: 'USED' });
    }

    qb.select([
      'uc',
      'r.coupon_name',
      'r.coupon_type',
      'r.biz_type',
      'r.threshold',
      'r.discount',
      'r.valid_from',
      'r.valid_to',
    ]);

    const rawTotal = await qb.clone().getCount();
    const raws = await qb
      .orderBy('uc.received_at', 'DESC')
      .offset((pageNo - 1) * pageSize)
      .limit(pageSize)
      .getRawMany<{
        uc_user_coupon_id: string;
        uc_customer_id: string;
        uc_coupon_rule_id: string;
        uc_status: 'UNUSED' | 'USED';
        uc_order_id: string | null;
        uc_received_at: string;
        uc_used_at: string | null;
        r_coupon_name: string;
        r_coupon_type: 'AMOUNT' | 'DISCOUNT';
        r_biz_type: 'FOOD' | 'ERRAND' | 'ALL';
        r_threshold: string;
        r_discount: string;
        r_valid_from: string;
        r_valid_to: string;
      }>();

    const items: MyCouponItemVo[] = raws.map((row) => {
      const validTo = Number(row.r_valid_to);
      const isExpired = row.uc_status === 'UNUSED' && validTo <= now;
      return {
        userCouponId: row.uc_user_coupon_id,
        couponRuleId: row.uc_coupon_rule_id,
        couponName: row.r_coupon_name,
        couponType: row.r_coupon_type,
        bizType: row.r_biz_type,
        threshold: row.r_threshold,
        discount: row.r_discount,
        validFrom: Number(row.r_valid_from),
        validTo,
        status: isExpired ? 'EXPIRED' : row.uc_status,
        receivedAt: Number(row.uc_received_at),
        usedAt: row.uc_used_at ? Number(row.uc_used_at) : null,
      };
    });

    return { items, total: rawTotal, pageNo, pageSize };
  }

  /**
   * 订单 preview 时校验优惠券是否可用,并算出抵扣金额(分)。
   *
   * 校验项:user_coupon 归属 + 状态 UNUSED + rule 在效期且 ACTIVE + bizType 匹配 + 满足门槛。
   * 不写库,纯只读 + 计算。
   *
   * @param goodsAmountCents 商品总额(分),用于校验门槛
   * @param orderBizType FOOD / ERRAND;券 bizType=ALL 时两边都可用
   */
  async validateForOrder(
    customerId: string,
    userCouponId: string,
    orderBizType: 'FOOD' | 'ERRAND',
    goodsAmountCents: bigint,
  ): Promise<CouponDiscountResult> {
    const now = Date.now();
    const uc = await this.userCouponRepo.findOne({ where: { userCouponId, customerId } });
    if (!uc) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        detail: 'COUPON_NOT_AVAILABLE',
        message: '优惠券不存在或不属于当前账户',
      });
    }
    if (uc.status !== 'UNUSED') {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        detail: uc.status === 'USED' ? 'ALREADY_USED' : 'COUPON_NOT_AVAILABLE',
        message: '优惠券已使用或已过期',
      });
    }
    const rule = await this.ruleRepo.findOne({ where: { couponRuleId: uc.couponRuleId } });
    if (!rule) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        detail: 'COUPON_NOT_AVAILABLE',
        message: '优惠券规则不存在',
      });
    }
    if (rule.status !== 'ACTIVE') {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        detail: 'COUPON_NOT_AVAILABLE',
        message: '优惠券不可用',
      });
    }
    if (Number(rule.validFrom) > now || Number(rule.validTo) <= now) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        detail: 'COUPON_EXPIRED',
        message: '优惠券已过期',
      });
    }
    if (rule.bizType !== 'ALL' && rule.bizType !== orderBizType) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        detail: 'COUPON_BIZ_MISMATCH',
        message: `该优惠券仅限${rule.bizType === 'FOOD' ? '外卖' : '跑腿'}使用`,
      });
    }
    const threshold = BigInt(rule.threshold);
    if (goodsAmountCents < threshold) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        detail: 'BELOW_COUPON_THRESHOLD',
        message: `订单金额未达 ¥${(Number(threshold) / 100).toFixed(2)}`,
      });
    }
    // 计算 discount
    let discountCents: bigint;
    if (rule.couponType === 'AMOUNT') {
      discountCents = BigInt(rule.discount);
    } else {
      // DISCOUNT:discount 是千分位 ‰,如 850 = 8.5 折,即抵扣 15%
      const permille = BigInt(rule.discount); // 0..1000
      discountCents = (goodsAmountCents * (1000n - permille)) / 1000n;
    }
    if (discountCents > goodsAmountCents) discountCents = goodsAmountCents;
    if (discountCents < 0n) discountCents = 0n;
    return {
      userCouponId: uc.userCouponId,
      couponRuleId: rule.couponRuleId,
      couponName: rule.couponName,
      discountCents,
    };
  }
}
