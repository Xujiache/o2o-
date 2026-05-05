import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** 外卖订单状态(stage 5 实现 WAIT_PAY/PAID_WAIT_MERCHANT/CANCELLED;后续状态由 stage 7/8 写入) */
export type FoodOrderStatus =
  | 'WAIT_PAY'
  | 'PAID_WAIT_MERCHANT'
  | 'MERCHANT_ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'RIDER_ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDING'
  | 'REFUNDED'
  | 'AFTER_SALE';

export type FoodOrderPayStatus = 'unpaid' | 'paid' | 'refunded';
export type FoodOrderDeliveryType = 'instant' | 'reserved';
export type FoodOrderCancelledBy = 'customer' | 'system' | 'merchant' | 'admin';

export interface FoodOrderAddressSnapshot {
  addressId: string;
  consignee: string;
  mobile: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  lng?: number;
  lat?: number;
}

@Entity('food_order')
@Index('uk_food_order_no', ['orderNo'], { unique: true })
@Index('idx_food_order_customer_status', ['customerId', 'status', 'createdAt'])
@Index('idx_food_order_store_status', ['storeId', 'status', 'createdAt'])
@Index('idx_food_order_status_created', ['status', 'createdAt'])
@Index('idx_food_order_city_status', ['cityCode', 'status', 'createdAt'])
export class FoodOrder {
  @PrimaryGeneratedColumn({ name: 'food_order_id', type: 'bigint' })
  foodOrderId!: string;

  @Column({ name: 'order_no', type: 'varchar', length: 32 })
  orderNo!: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId!: string;

  @Column({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ name: 'city_code', type: 'varchar', length: 16 })
  cityCode!: string;

  @Column({ type: 'varchar', length: 32, default: 'WAIT_PAY' })
  status!: FoodOrderStatus;

  @Column({ name: 'pay_status', type: 'varchar', length: 16, default: 'unpaid' })
  payStatus!: FoodOrderPayStatus;

  @Column({ name: 'delivery_type', type: 'varchar', length: 16, default: 'instant' })
  deliveryType!: FoodOrderDeliveryType;

  @Column({ name: 'reserved_time', type: 'bigint', nullable: true })
  reservedTime!: string | null;

  @Column({ name: 'goods_amount', type: 'bigint' })
  goodsAmount!: string;

  @Column({ name: 'delivery_fee', type: 'bigint', default: 0 })
  deliveryFee!: string;

  @Column({ name: 'discount_amount', type: 'bigint', default: 0 })
  discountAmount!: string;

  @Column({ name: 'payable_amount', type: 'bigint' })
  payableAmount!: string;

  @Column({ name: 'paid_amount', type: 'bigint', nullable: true })
  paidAmount!: string | null;

  @Column({ name: 'address_snapshot', type: 'json' })
  addressSnapshot!: FoodOrderAddressSnapshot;

  @Column({ type: 'varchar', length: 512, nullable: true })
  remark!: string | null;

  @Column({ name: 'expire_at', type: 'bigint' })
  expireAt!: string;

  @Column({ name: 'paid_at', type: 'bigint', nullable: true })
  paidAt!: string | null;

  @Column({ name: 'cancelled_at', type: 'bigint', nullable: true })
  cancelledAt!: string | null;

  @Column({ name: 'cancelled_by', type: 'varchar', length: 16, nullable: true })
  cancelledBy!: FoodOrderCancelledBy | null;

  @Column({ name: 'cancelled_reason', type: 'varchar', length: 255, nullable: true })
  cancelledReason!: string | null;

  @Column({ name: 'completed_at', type: 'bigint', nullable: true })
  completedAt!: string | null;

  @Column({ name: 'accepted_at', type: 'bigint', nullable: true })
  acceptedAt!: string | null;

  @Column({ name: 'expected_ready_at', type: 'bigint', nullable: true })
  expectedReadyAt!: string | null;

  @Column({ name: 'ready_at', type: 'bigint', nullable: true })
  readyAt!: string | null;

  @Column({ name: 'reject_reason', type: 'varchar', length: 255, nullable: true })
  rejectReason!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
