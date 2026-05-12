import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type UserCouponStatus = 'UNUSED' | 'USED' | 'EXPIRED';

/**
 * 用户领取的优惠券实例。
 *
 * - `(customer_id, coupon_rule_id)` 唯一,确保同一用户对同一张券模板只能领一次。
 * - status 仅持久化 UNUSED / USED;EXPIRED 由查询时按 valid_to 实时判定后返回(不写离线 job)。
 */
@Entity('user_coupon')
@Index('uk_user_coupon_customer_rule', ['customerId', 'couponRuleId'], { unique: true })
@Index('idx_user_coupon_customer_status', ['customerId', 'status'])
export class UserCoupon {
  @PrimaryGeneratedColumn({ name: 'user_coupon_id', type: 'bigint' })
  userCouponId!: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId!: string;

  @Column({ name: 'coupon_rule_id', type: 'bigint' })
  couponRuleId!: string;

  @Column({ type: 'varchar', length: 16, default: 'UNUSED' })
  status!: UserCouponStatus;

  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  orderId!: string | null;

  @Column({ name: 'received_at', type: 'bigint' })
  receivedAt!: string;

  @Column({ name: 'used_at', type: 'bigint', nullable: true })
  usedAt!: string | null;
}
