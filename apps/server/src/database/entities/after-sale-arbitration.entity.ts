import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ArbitrationResponsibleParty = 'MERCHANT' | 'RIDER' | 'CUSTOMER' | 'PLATFORM';
export type ArbitrationDecision = 'APPROVE' | 'REJECT' | 'PARTIAL';

@Entity('after_sale_arbitration')
@Index('idx_arbitration_after_sale', ['afterSaleId'])
export class AfterSaleArbitration {
  @PrimaryGeneratedColumn({ name: 'arbitration_id', type: 'bigint' })
  arbitrationId!: string;

  @Column({ name: 'after_sale_id', type: 'bigint' })
  afterSaleId!: string;

  @Column({ name: 'responsible_party', type: 'varchar', length: 16 })
  responsibleParty!: ArbitrationResponsibleParty;

  @Column({ type: 'varchar', length: 16 })
  decision!: ArbitrationDecision;

  @Column({ name: 'refund_amount', type: 'bigint', default: 0 })
  refundAmount!: string;

  @Column({ type: 'bigint', default: 0 })
  penalty!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  remark!: string | null;

  @Column({ name: 'operator_admin_id', type: 'bigint' })
  operatorAdminId!: string;

  @Column({ name: 'refund_order_id', type: 'bigint', nullable: true })
  refundOrderId!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
