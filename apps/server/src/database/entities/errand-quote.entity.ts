import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import type { ErrandAddressSnapshot } from './errand-order-detail.entity';
import type { ErrandOrderTypeCode, ErrandOrderUrgentLevel } from './errand-order.entity';

export interface ProhibitedWarning {
  keyword: string;
  level: 'WARN' | 'REJECT';
  description: string;
}

@Entity('errand_quote')
@Index('idx_errand_quote_customer', ['customerId', 'createdAt'])
@Index('idx_errand_quote_expire', ['expireAt'])
export class ErrandQuote {
  @PrimaryGeneratedColumn({ name: 'errand_quote_id', type: 'bigint' })
  errandQuoteId!: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId!: string;

  @Column({ name: 'type_code', type: 'varchar', length: 16 })
  typeCode!: ErrandOrderTypeCode;

  @Column({ name: 'pickup_address', type: 'json', nullable: true })
  pickupAddress!: ErrandAddressSnapshot | null;

  @Column({ name: 'delivery_address', type: 'json' })
  deliveryAddress!: ErrandAddressSnapshot;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  weight!: string | null;

  @Column({ name: 'urgent_level', type: 'varchar', length: 16, default: 'standard' })
  urgentLevel!: ErrandOrderUrgentLevel;

  @Column({ type: 'bigint', nullable: true })
  budget!: string | null;

  @Column({ name: 'distance_meters', type: 'int', default: 0 })
  distanceMeters!: number;

  @Column({ name: 'base_fee', type: 'bigint', default: 0 })
  baseFee!: string;

  @Column({ name: 'distance_fee', type: 'bigint', default: 0 })
  distanceFee!: string;

  @Column({ name: 'urgent_fee', type: 'bigint', default: 0 })
  urgentFee!: string;

  @Column({ name: 'payable_amount', type: 'bigint' })
  payableAmount!: string;

  @Column({ name: 'item_desc', type: 'text', nullable: true })
  itemDesc!: string | null;

  @Column({ name: 'task_desc', type: 'text', nullable: true })
  taskDesc!: string | null;

  @Column({ name: 'reserved_time', type: 'bigint', nullable: true })
  reservedTime!: string | null;

  @Column({ name: 'prohibited_warnings', type: 'json' })
  prohibitedWarnings!: ProhibitedWarning[];

  @Column({ name: 'used_order_id', type: 'bigint', nullable: true })
  usedOrderId!: string | null;

  @Column({ name: 'expire_at', type: 'bigint' })
  expireAt!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
