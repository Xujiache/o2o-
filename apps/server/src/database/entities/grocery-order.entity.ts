import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type GroceryOrderStatus =
  | 'WAIT_PAY'
  | 'PAID_WAIT_PICKUP'
  | 'SETTLING'
  | 'DIFF_PAYING'
  | 'PICKED_UP'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDING'
  | 'REFUNDED';

export type GroceryOrderPayStatus = 'unpaid' | 'paid' | 'refunded';
export type GroceryOrderDiffPayStatus = 'none' | 'unpaid' | 'paying' | 'paid' | 'refunding' | 'refunded';
export type GroceryOrderCancelledBy = 'customer' | 'system' | 'merchant' | 'admin';

@Entity('grocery_order')
@Index('uk_grocery_order_no', ['orderNo'], { unique: true })
@Index('idx_grocery_order_customer_status', ['customerId', 'status', 'createdAt'])
@Index('idx_grocery_order_merchant_status', ['merchantId', 'status', 'createdAt'])
@Index('idx_grocery_order_pickup', ['pickupPointId', 'pickupDate', 'status'])
@Index('idx_grocery_order_pickup_code_hash', ['pickupCodeHash'])
@Index('idx_grocery_order_expire', ['expireAt', 'payStatus'])
export class GroceryOrder {
  @PrimaryGeneratedColumn({ name: 'grocery_order_id', type: 'bigint' })
  groceryOrderId!: string;

  @Column({ name: 'order_no', type: 'varchar', length: 32 })
  orderNo!: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId!: string;

  @Column({ name: 'merchant_id', type: 'bigint' })
  merchantId!: string;

  @Column({ name: 'pickup_point_id', type: 'bigint' })
  pickupPointId!: string;

  @Column({ name: 'pickup_slot_id', type: 'bigint' })
  pickupSlotId!: string;

  @Column({ name: 'pickup_date', type: 'date' })
  pickupDate!: string;

  @Column({ name: 'pickup_start_minute', type: 'smallint' })
  pickupStartMinute!: number;

  @Column({ name: 'pickup_end_minute', type: 'smallint' })
  pickupEndMinute!: number;

  @Column({ name: 'pickup_code', type: 'varchar', length: 8, nullable: true })
  pickupCode!: string | null;

  @Column({ name: 'pickup_code_hash', type: 'char', length: 64, nullable: true })
  pickupCodeHash!: string | null;

  @Column({ type: 'varchar', length: 24, default: 'WAIT_PAY' })
  status!: GroceryOrderStatus;

  @Column({ name: 'pay_status', type: 'varchar', length: 16, default: 'unpaid' })
  payStatus!: GroceryOrderPayStatus;

  @Column({ name: 'estimated_goods_amount', type: 'bigint' })
  estimatedGoodsAmount!: string;

  @Column({ name: 'discount_amount', type: 'bigint', default: 0 })
  discountAmount!: string;

  @Column({ name: 'estimated_payable_amount', type: 'bigint' })
  estimatedPayableAmount!: string;

  @Column({ name: 'paid_amount', type: 'bigint', nullable: true })
  paidAmount!: string | null;

  @Column({ name: 'final_goods_amount', type: 'bigint', nullable: true })
  finalGoodsAmount!: string | null;

  @Column({ name: 'final_payable_amount', type: 'bigint', nullable: true })
  finalPayableAmount!: string | null;

  @Column({ name: 'diff_amount', type: 'bigint', nullable: true })
  diffAmount!: string | null;

  @Column({ name: 'diff_pay_status', type: 'varchar', length: 16, nullable: true })
  diffPayStatus!: GroceryOrderDiffPayStatus | null;

  @Column({ name: 'coupon_id', type: 'bigint', nullable: true })
  couponId!: string | null;

  @Column({ name: 'expire_at', type: 'bigint' })
  expireAt!: string;

  @Column({ name: 'paid_at', type: 'bigint', nullable: true })
  paidAt!: string | null;

  @Column({ name: 'settling_at', type: 'bigint', nullable: true })
  settlingAt!: string | null;

  @Column({ name: 'settled_at', type: 'bigint', nullable: true })
  settledAt!: string | null;

  @Column({ name: 'picked_up_at', type: 'bigint', nullable: true })
  pickedUpAt!: string | null;

  @Column({ name: 'completed_at', type: 'bigint', nullable: true })
  completedAt!: string | null;

  @Column({ name: 'cancelled_at', type: 'bigint', nullable: true })
  cancelledAt!: string | null;

  @Column({ name: 'cancelled_by', type: 'varchar', length: 16, nullable: true })
  cancelledBy!: GroceryOrderCancelledBy | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true })
  cancelReason!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  remark!: string | null;

  @Column({ name: 'verify_operator_id', type: 'bigint', nullable: true })
  verifyOperatorId!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
