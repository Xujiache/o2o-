import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RiderViolationType = 'EXCEPTION' | 'LATE' | 'COMPLAINT' | 'FRAUD';
export type RiderViolationStatus = 'REPORTED' | 'PENDING_PLATFORM' | 'CONFIRMED' | 'DROPPED';

@Entity('rider_violation')
@Index('idx_rider_violation_rider_status', ['riderId', 'status', 'createdAt'])
@Index('idx_rider_violation_task', ['riderTaskId'])
@Index('idx_rider_violation_type_status', ['type', 'status'])
export class RiderViolation {
  @PrimaryGeneratedColumn({ name: 'rider_violation_id', type: 'bigint' })
  riderViolationId!: string;

  @Column({ name: 'rider_id', type: 'bigint' })
  riderId!: string;

  @Column({ name: 'rider_task_id', type: 'bigint', nullable: true })
  riderTaskId!: string | null;

  @Column({ type: 'varchar', length: 16 })
  type!: RiderViolationType;

  @Column({ type: 'varchar', length: 500 })
  description!: string;

  @Column({ name: 'photos_json', type: 'json', nullable: true })
  photosJson!: string[] | null;

  @Column({ name: 'deduct_cents', type: 'bigint', nullable: true })
  deductCents!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'REPORTED' })
  status!: RiderViolationStatus;

  @Column({ name: 'reported_at', type: 'bigint' })
  reportedAt!: string;

  @Column({ name: 'decided_at', type: 'bigint', nullable: true })
  decidedAt!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  decision!: string | null;

  @Column({ name: 'deducted_to_earning_id', type: 'bigint', nullable: true })
  deductedToEarningId!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
