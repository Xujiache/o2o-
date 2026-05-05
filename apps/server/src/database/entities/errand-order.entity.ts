import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ErrandOrderStatus =
  | 'WAIT_PAY'
  | 'PAID'
  | 'DISPATCHING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type ErrandOrderPayStatus = 'unpaid' | 'paid' | 'refunded';
export type ErrandOrderUrgentLevel = 'standard' | 'fast' | 'express';
export type ErrandOrderTypeCode = 'BUY' | 'DELIVER' | 'HELP' | 'CUSTOM';
export type ErrandOrderCancelledBy = 'customer' | 'system' | 'admin';

@Entity('errand_order')
@Index('uk_errand_order_no', ['orderNo'], { unique: true })
@Index('idx_errand_order_customer_status', ['customerId', 'status', 'createdAt'])
@Index('idx_errand_order_status_created', ['status', 'createdAt'])
@Index('idx_errand_order_pay_order', ['payOrderId'])
export class ErrandOrder {
  @PrimaryGeneratedColumn({ name: 'errand_order_id', type: 'bigint' })
  errandOrderId!: string;

  @Column({ name: 'order_no', type: 'varchar', length: 32 })
  orderNo!: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId!: string;

  @Column({ name: 'type_code', type: 'varchar', length: 16 })
  typeCode!: ErrandOrderTypeCode;

  @Column({ type: 'varchar', length: 32, default: 'WAIT_PAY' })
  status!: ErrandOrderStatus;

  @Column({ name: 'pay_status', type: 'varchar', length: 16, default: 'unpaid' })
  payStatus!: ErrandOrderPayStatus;

  @Column({ name: 'pay_order_id', type: 'bigint', nullable: true })
  payOrderId!: string | null;

  @Column({ name: 'base_fee', type: 'bigint', default: 0 })
  baseFee!: string;

  @Column({ name: 'distance_fee', type: 'bigint', default: 0 })
  distanceFee!: string;

  @Column({ name: 'urgent_fee', type: 'bigint', default: 0 })
  urgentFee!: string;

  @Column({ name: 'budget', type: 'bigint', nullable: true })
  budget!: string | null;

  @Column({ name: 'payable_amount', type: 'bigint' })
  payableAmount!: string;

  @Column({ name: 'paid_amount', type: 'bigint', nullable: true })
  paidAmount!: string | null;

  @Column({ name: 'urgent_level', type: 'varchar', length: 16, default: 'standard' })
  urgentLevel!: ErrandOrderUrgentLevel;

  @Column({ name: 'reserved_time', type: 'bigint', nullable: true })
  reservedTime!: string | null;

  @Column({ name: 'expire_at', type: 'bigint' })
  expireAt!: string;

  @Column({ name: 'paid_at', type: 'bigint', nullable: true })
  paidAt!: string | null;

  @Column({ name: 'dispatching_at', type: 'bigint', nullable: true })
  dispatchingAt!: string | null;

  @Column({ name: 'cancelled_at', type: 'bigint', nullable: true })
  cancelledAt!: string | null;

  @Column({ name: 'cancelled_by', type: 'varchar', length: 16, nullable: true })
  cancelledBy!: ErrandOrderCancelledBy | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true })
  cancelReason!: string | null;

  @Column({ name: 'completed_at', type: 'bigint', nullable: true })
  completedAt!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
