import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PointsRecordBizType = 'FOOD' | 'ERRAND' | 'SYSTEM';
export type PointsRecordChangeType = 'EARN' | 'USE' | 'ADJUST' | 'EXPIRE';

@Entity('points_record')
@Index('idx_points_record_customer_created', ['customerId', 'createdAt'])
@Index('idx_points_record_biz', ['bizType', 'bizOrderId'])
export class PointsRecord {
  @PrimaryGeneratedColumn({ name: 'points_record_id', type: 'bigint' })
  pointsRecordId!: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId!: string;

  @Column({ name: 'change_type', type: 'varchar', length: 16 })
  changeType!: PointsRecordChangeType;

  @Column({ name: 'biz_type', type: 'varchar', length: 16 })
  bizType!: PointsRecordBizType;

  @Column({ name: 'biz_order_id', type: 'bigint', nullable: true })
  bizOrderId!: string | null;

  /** Signed delta: earn/adjust positive, use/expire negative. */
  @Column({ type: 'int' })
  points!: number;

  @Column({ name: 'balance_after', type: 'int', nullable: true })
  balanceAfter!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remark!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
