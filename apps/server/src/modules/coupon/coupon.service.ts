import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { EntityManager, Repository } from 'typeorm';

import { CouponLock, UserCoupon } from '../../database/entities';

/**
 * 订单链路对优惠券的状态机操作。
 *
 * 表语义复用:`coupon_lock.coupon_id` 存储 `user_coupon_id`(用户领取的实例 id),
 * 这样从 lock/release/consume 一行就能反查到对应 user_coupon,无需扩列。
 *
 * 三件事 — 都接受调用方传入的 EntityManager,确保和订单事务一致:
 *  - lockCoupons:下单 submit 事务里调用,把 user_coupon UNUSED → USED 并落 lock(active)
 *  - releaseCoupons:订单取消事务里调用,user_coupon USED → UNUSED 并 lock active → released
 *  - consumeCoupons:支付成功事务里调用,lock active → consumed,user_coupon 保持 USED
 */
@Injectable()
export class CouponService {
  constructor(@InjectRepository(CouponLock) private readonly couponLockRepo: Repository<CouponLock>) {}

  async lockCoupons(em: EntityManager, orderId: string, userCouponId: string, customerId: string): Promise<void> {
    if (!userCouponId) return;

    // 1. 校验 user_coupon 归属 + 状态 UNUSED + 抢占 USED
    const update = await em
      .getRepository(UserCoupon)
      .createQueryBuilder()
      .update()
      .set({ status: 'USED', orderId, usedAt: String(Date.now()) })
      .where('user_coupon_id = :id AND customer_id = :cid AND status = :s', {
        id: userCouponId,
        cid: customerId,
        s: 'UNUSED',
      })
      .execute();
    if ((update.affected ?? 0) === 0) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        detail: 'COUPON_NOT_AVAILABLE',
        message: '优惠券已被使用或不可用',
      });
    }

    // 2. 写 coupon_lock(coupon_id 字段复用为 user_coupon_id)
    await em.getRepository(CouponLock).insert({
      orderId,
      couponId: userCouponId,
      customerId,
      status: 'active',
      createdAt: String(Date.now()),
    });
  }

  async releaseCoupons(em: EntityManager, orderId: string): Promise<number> {
    const locks = await em.getRepository(CouponLock).find({ where: { orderId, status: 'active' } });
    if (locks.length === 0) return 0;
    const now = String(Date.now());
    for (const lock of locks) {
      await em
        .getRepository(CouponLock)
        .update({ couponLockId: lock.couponLockId }, { status: 'released', releasedAt: now });
      // 回滚 user_coupon USED → UNUSED
      await em
        .getRepository(UserCoupon)
        .update({ userCouponId: lock.couponId, status: 'USED' }, { status: 'UNUSED', orderId: null, usedAt: null });
    }
    return locks.length;
  }

  async consumeCoupons(em: EntityManager, orderId: string): Promise<number> {
    const r = await em
      .getRepository(CouponLock)
      .update({ orderId, status: 'active' }, { status: 'consumed', releasedAt: String(Date.now()) });
    return r.affected ?? 0;
  }
}
