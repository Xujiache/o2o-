import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sys_audit_log')
@Index('idx_audit_trace', ['traceId'])
@Index('idx_audit_target', ['targetType', 'targetId'])
@Index('idx_audit_created', ['createdAt'])
export class SysAuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'trace_id', type: 'varchar', length: 128 })
  traceId!: string;

  @Column({ name: 'operator_type', type: 'varchar', length: 32 })
  operatorType!: string;

  @Column({ name: 'operator_id', type: 'varchar', length: 64, nullable: true })
  operatorId!: string | null;

  @Column({ name: 'target_type', type: 'varchar', length: 64 })
  targetType!: string;

  @Column({ name: 'target_id', type: 'varchar', length: 64, nullable: true })
  targetId!: string | null;

  @Column({ name: 'before_status', type: 'varchar', length: 64, nullable: true })
  beforeStatus!: string | null;

  @Column({ name: 'after_status', type: 'varchar', length: 64, nullable: true })
  afterStatus!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null;

  @Column({ name: 'device_id', type: 'varchar', length: 128, nullable: true })
  deviceId!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  summary!: string | null;

  @Column({ name: 'detail_ref', type: 'varchar', length: 64, nullable: true, comment: 'Mongo audit_log_detail._id' })
  detailRef!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
