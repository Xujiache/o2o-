import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PaymentOrderBizType = 'FOOD' | 'ERRAND';
export type PaymentOrderChannel = 'wxpay' | 'alipay';
export type PaymentOrderStatus = 'pending' | 'success' | 'failed' | 'expired' | 'refunded';

export interface PaymentCallbackRaw {
  rawBody: string;
  parsedAt: number;
  channelTradeNo?: string;
  paidAmount?: string;
  paidAt?: number;
}

@Entity('payment_order')
@Index('uk_payment_order_no', ['payOrderNo'], { unique: true })
@Index('idx_payment_order_biz', ['bizType', 'bizId'])
@Index('idx_payment_order_status_expire', ['status', 'expireAt'])
export class PaymentOrder {
  @PrimaryGeneratedColumn({ name: 'payment_order_id', type: 'bigint' })
  paymentOrderId!: string;

  @Column({ name: 'pay_order_no', type: 'varchar', length: 32 })
  payOrderNo!: string;

  @Column({ name: 'biz_type', type: 'varchar', length: 16 })
  bizType!: PaymentOrderBizType;

  @Column({ name: 'biz_id', type: 'bigint' })
  bizId!: string;

  @Column({ name: 'pay_channel', type: 'varchar', length: 16 })
  payChannel!: PaymentOrderChannel;

  @Column({ name: 'payable_amount', type: 'bigint' })
  payableAmount!: string;

  @Column({ name: 'paid_amount', type: 'bigint', nullable: true })
  paidAmount!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: PaymentOrderStatus;

  @Column({ name: 'channel_trade_no', type: 'varchar', length: 64, nullable: true })
  channelTradeNo!: string | null;

  @Column({ name: 'callback_raw', type: 'json', nullable: true })
  callbackRaw!: PaymentCallbackRaw | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;

  @Column({ name: 'expire_at', type: 'bigint' })
  expireAt!: string;

  @Column({ name: 'paid_at', type: 'bigint', nullable: true })
  paidAt!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
