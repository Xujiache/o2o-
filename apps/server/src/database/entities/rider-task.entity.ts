import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RiderTaskBizType = 'FOOD' | 'ERRAND';
export type RiderTaskStatus =
  | 'ASSIGNED'
  | 'ARRIVED_PICKUP'
  | 'PICKED_UP'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'EXCEPTION'
  | 'CANCELLED';

@Entity('rider_task')
@Index('idx_rider_task_rider_status', ['riderId', 'status', 'createdAt'])
@Index('idx_rider_task_biz', ['bizType', 'bizOrderId'])
@Index('idx_rider_task_dispatch', ['dispatchTaskId'])
export class RiderTask {
  @PrimaryGeneratedColumn({ name: 'rider_task_id', type: 'bigint' })
  riderTaskId!: string;

  @Column({ name: 'dispatch_task_id', type: 'bigint' })
  dispatchTaskId!: string;

  @Column({ name: 'rider_id', type: 'bigint' })
  riderId!: string;

  @Column({ name: 'biz_type', type: 'varchar', length: 16 })
  bizType!: RiderTaskBizType;

  @Column({ name: 'biz_order_id', type: 'bigint' })
  bizOrderId!: string;

  @Column({ name: 'biz_task_id', type: 'bigint', nullable: true })
  bizTaskId!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'ASSIGNED' })
  status!: RiderTaskStatus;

  @Column({ name: 'accepted_at', type: 'bigint' })
  acceptedAt!: string;

  @Column({ name: 'arrived_pickup_at', type: 'bigint', nullable: true })
  arrivedPickupAt!: string | null;

  @Column({ name: 'picked_up_at', type: 'bigint', nullable: true })
  pickedUpAt!: string | null;

  @Column({ name: 'delivered_at', type: 'bigint', nullable: true })
  deliveredAt!: string | null;

  @Column({ name: 'eta_at', type: 'bigint', nullable: true })
  etaAt!: string | null;

  @Column({ name: 'exception_at', type: 'bigint', nullable: true })
  exceptionAt!: string | null;

  @Column({ name: 'cancelled_at', type: 'bigint', nullable: true })
  cancelledAt!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
