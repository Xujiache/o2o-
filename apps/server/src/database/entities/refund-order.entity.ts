import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RefundOrderBizType = 'FOOD' | 'ERRAND' | 'GROCERY';
export type RefundOrderStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CLOSED';

@Entity('refund_order')
@Index('idx_refund_order_no', ['refundNo'], { unique: true })
@Index('idx_refund_order_biz', ['bizType', 'bizOrderId'])
export class RefundOrder {
  @PrimaryGeneratedColumn({ name: 'refund_order_id', type: 'bigint' })
  refundOrderId!: string;

  @Column({ name: 'refund_no', type: 'varchar', length: 40 })
  refundNo!: string;

  @Column({ name: 'biz_type', type: 'varchar', length: 16 })
  bizType!: RefundOrderBizType;

  @Column({ name: 'biz_order_id', type: 'bigint' })
  bizOrderId!: string;

  @Column({ name: 'payment_order_id', type: 'bigint', nullable: true })
  paymentOrderId!: string | null;

  @Column({ type: 'bigint' })
  amount!: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: RefundOrderStatus;

  @Column({ type: 'varchar', length: 20, default: 'wxpay' })
  provider!: string;

  @Column({ name: 'provider_refund_id', type: 'varchar', length: 80, nullable: true })
  providerRefundId!: string | null;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
