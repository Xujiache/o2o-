import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type MerchantOrderAction = 'ACCEPT' | 'REJECT' | 'READY' | 'REMARK';

@Entity('merchant_order_action_log')
@Index('idx_merchant_order_action_log_order', ['orderId', 'createdAt'])
@Index('idx_merchant_order_action_log_merchant', ['merchantId', 'createdAt'])
export class MerchantOrderActionLog {
  @PrimaryGeneratedColumn({ name: 'merchant_order_action_log_id', type: 'bigint' })
  merchantOrderActionLogId!: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId!: string;

  @Column({ name: 'merchant_id', type: 'bigint' })
  merchantId!: string;

  @Column({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ type: 'varchar', length: 16 })
  action!: MerchantOrderAction;

  @Column({ name: 'before_status', type: 'varchar', length: 32, nullable: true })
  beforeStatus!: string | null;

  @Column({ name: 'after_status', type: 'varchar', length: 32, nullable: true })
  afterStatus!: string | null;

  @Column({ name: 'payload_json', type: 'json', nullable: true })
  payloadJson!: Record<string, unknown> | null;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true })
  operatorId!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
