import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { CouponLock } from '../../database/entities';

/**
 * coupon 模块(stage 5 最小化 — 用户拍板 A6 甲方案):
 *  - 仅建 coupon_lock 表 + service 方法
 *  - lockCoupons:本阶段任意 couponId 都返 INVALID_PARAM,防御层(正常 preview 已拦截)
 *  - releaseCoupons / consumeCoupons:UPDATE coupon_lock SET status=...
 *  - 真实发券 / 抵扣 / 积分获得逻辑 → stage 6/7 实现
 */
@Injectable()
export class CouponService {
  constructor(@InjectRepository(CouponLock) private readonly couponLockRepo: Repository<CouponLock>) {}

  /** stage 5 抛 INVALID_PARAM(防御层;preview 入参 couponId 已先拒) */
  async lockCoupons(_orderId: string, couponId: string, _customerId: string): Promise<void> {
    if (!couponId) return;
    throw new UnprocessableEntityException({
      code: ErrorCode.INVALID_PARAM,
      detail: 'COUPON_NOT_AVAILABLE',
      message: '当前活动暂未开放,请下次再来',
    });
  }

  /** 释放该订单的所有 active coupon_lock 行 → released */
  async releaseCoupons(orderId: string): Promise<number> {
    const r = await this.couponLockRepo.update(
      { orderId, status: 'active' },
      { status: 'released', releasedAt: String(Date.now()) },
    );
    return r.affected ?? 0;
  }

  /** 支付成功:active → consumed */
  async consumeCoupons(orderId: string): Promise<number> {
    const r = await this.couponLockRepo.update(
      { orderId, status: 'active' },
      { status: 'consumed', releasedAt: String(Date.now()) },
    );
    return r.affected ?? 0;
  }
}
