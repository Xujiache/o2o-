import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type CouponLockStatus = 'active' | 'released' | 'consumed';

@Entity('coupon_lock')
@Index('idx_coupon_lock_coupon', ['couponId'])
@Index('idx_coupon_lock_customer_status', ['customerId', 'status'])
@Index('idx_coupon_lock_order', ['orderId'])
export class CouponLock {
  @PrimaryGeneratedColumn({ name: 'coupon_lock_id', type: 'bigint' })
  couponLockId!: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId!: string;

  @Column({ name: 'coupon_id', type: 'bigint' })
  couponId!: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId!: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: CouponLockStatus;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'released_at', type: 'bigint', nullable: true })
  releasedAt!: string | null;
}
