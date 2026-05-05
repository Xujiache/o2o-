import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RiderAuditEventType =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'disabled'
  | 'enabled'
  | 'online'
  | 'offline'
  | 'health_cert_expiring'
  | 'health_cert_expired'
  | 'location_batch'
  | 'audit_timeout';

export type RiderAuditOperatorType = 'rider' | 'admin' | 'system';

@Entity('rider_audit_log')
@Index('idx_rider_audit_rider_created', ['riderId', 'createdAt'])
@Index('idx_rider_audit_event', ['eventType'])
export class RiderAuditLog {
  @PrimaryGeneratedColumn({ name: 'audit_log_id', type: 'bigint' })
  auditLogId!: string;

  @Column({ name: 'rider_id', type: 'bigint', nullable: true })
  riderId!: string | null;

  @Column({ name: 'application_id', type: 'bigint', nullable: true })
  applicationId!: string | null;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: [
      'submitted',
      'approved',
      'rejected',
      'disabled',
      'enabled',
      'online',
      'offline',
      'health_cert_expiring',
      'health_cert_expired',
      'location_batch',
      'audit_timeout',
    ],
  })
  eventType!: RiderAuditEventType;

  @Column({
    name: 'operator_type',
    type: 'enum',
    enum: ['rider', 'admin', 'system'],
  })
  operatorType!: RiderAuditOperatorType;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true })
  operatorId!: string | null;

  @Column({ type: 'json', nullable: true })
  detail!: Record<string, unknown> | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
