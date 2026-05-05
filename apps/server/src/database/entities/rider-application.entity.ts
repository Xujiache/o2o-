import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RiderAuditStatus = 'pending' | 'approved' | 'rejected' | 'disabled';

@Entity('rider_application')
@Index('idx_rider_app_mobile_submitted', ['mobile', 'submittedAt'])
@Index('idx_rider_app_audit_status', ['auditStatus', 'submittedAt'])
export class RiderApplication {
  @PrimaryGeneratedColumn({ name: 'application_id', type: 'bigint' })
  applicationId!: string;

  @Column({ name: 'rider_id', type: 'bigint', nullable: true })
  riderId!: string | null;

  @Column({ type: 'varchar', length: 20 })
  mobile!: string;

  @Column({ name: 'real_name', type: 'varchar', length: 50 })
  realName!: string;

  @Column({ name: 'id_card_no', type: 'varchar', length: 18 })
  idCardNo!: string;

  @Column({ name: 'health_cert_no', type: 'varchar', length: 50 })
  healthCertNo!: string;

  @Column({ name: 'health_cert_expiry', type: 'bigint' })
  healthCertExpiry!: string;

  @Column({
    name: 'audit_status',
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'disabled'],
    default: 'pending',
  })
  auditStatus!: RiderAuditStatus;

  @Column({ name: 'reject_reason', type: 'varchar', length: 500, nullable: true })
  rejectReason!: string | null;

  @Column({ name: 'audited_at', type: 'bigint', nullable: true })
  auditedAt!: string | null;

  @Column({ name: 'audited_by', type: 'bigint', nullable: true })
  auditedBy!: string | null;

  @Column({ name: 'submitted_at', type: 'bigint' })
  submittedAt!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
