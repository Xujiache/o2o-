import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type MerchantAuditStatus = 'pending' | 'approved' | 'rejected' | 'disabled';

@Entity('merchant_application')
@Index('idx_merchant_status', ['merchantId', 'auditStatus', 'submittedAt'])
@Index('idx_pending', ['auditStatus', 'submittedAt'])
export class MerchantApplication {
  @PrimaryGeneratedColumn({ name: 'application_id', type: 'bigint' })
  applicationId!: string;

  @Column({ name: 'merchant_id', type: 'bigint' })
  merchantId!: string;

  @Column({
    name: 'audit_status',
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'disabled'],
    default: 'pending',
  })
  auditStatus!: MerchantAuditStatus;

  @Column({ name: 'store_name', type: 'varchar', length: 128 })
  storeName!: string;

  @Column({ name: 'business_scope', type: 'varchar', length: 255 })
  businessScope!: string;

  @Column({ name: 'legal_person', type: 'varchar', length: 50 })
  legalPerson!: string;

  @Column({ name: 'id_card_no', type: 'varchar', length: 30 })
  idCardNo!: string;

  @Column({ name: 'license_no', type: 'varchar', length: 40 })
  licenseNo!: string;

  @Column({ name: 'food_permit_no', type: 'varchar', length: 40, nullable: true })
  foodPermitNo!: string | null;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 4, nullable: true })
  commissionRate!: string | null;

  @Column({ name: 'reject_reason', type: 'varchar', length: 500, nullable: true })
  rejectReason!: string | null;

  @Column({ name: 'submitted_at', type: 'bigint' })
  submittedAt!: string;

  @Column({ name: 'audited_at', type: 'bigint', nullable: true })
  auditedAt!: string | null;

  @Column({ name: 'audited_by', type: 'bigint', nullable: true })
  auditedBy!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
