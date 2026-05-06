import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('manual_dispatch_log')
@Index('idx_manual_dispatch_log_task', ['dispatchTaskId'])
export class ManualDispatchLog {
  @PrimaryGeneratedColumn({ name: 'log_id', type: 'bigint' })
  logId!: string;

  @Column({ name: 'dispatch_task_id', type: 'bigint' })
  dispatchTaskId!: string;

  @Column({ name: 'rider_id', type: 'bigint' })
  riderId!: string;

  @Column({ name: 'operator_admin_id', type: 'bigint' })
  operatorAdminId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({ name: 'before_status', type: 'varchar', length: 20 })
  beforeStatus!: string;

  @Column({ name: 'after_status', type: 'varchar', length: 20 })
  afterStatus!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
