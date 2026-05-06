import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type DispatchBizType = 'FOOD' | 'ERRAND';
export type DispatchTaskStatus = 'PENDING' | 'DISPATCHED' | 'TIMEOUT' | 'CANCELLED';

@Entity('dispatch_task')
@Index('idx_dispatch_task_biz', ['bizType', 'bizOrderId'])
@Index('idx_dispatch_task_status_timeout', ['status', 'timeoutAt'])
export class DispatchTask {
  @PrimaryGeneratedColumn({ name: 'dispatch_task_id', type: 'bigint' })
  dispatchTaskId!: string;

  @Column({ name: 'biz_type', type: 'varchar', length: 16 })
  bizType!: DispatchBizType;

  @Column({ name: 'biz_order_id', type: 'bigint' })
  bizOrderId!: string;

  @Column({ name: 'biz_task_id', type: 'bigint', nullable: true })
  bizTaskId!: string | null;

  @Column({ name: 'candidate_rider_ids', type: 'json', nullable: true })
  candidateRiderIds!: string[] | null;

  @Column({ name: 'accepted_rider_id', type: 'bigint', nullable: true })
  acceptedRiderId!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: DispatchTaskStatus;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;

  @Column({ name: 'dispatched_at', type: 'bigint' })
  dispatchedAt!: string;

  @Column({ name: 'timeout_at', type: 'bigint' })
  timeoutAt!: string;

  @Column({ name: 'completed_at', type: 'bigint', nullable: true })
  completedAt!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
