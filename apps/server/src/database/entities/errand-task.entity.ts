import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import type { ErrandAddressSnapshot } from './errand-order-detail.entity';

export type ErrandTaskStatus = 'READY_FOR_DISPATCH' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';

@Entity('errand_task')
@Index('uk_errand_task_order', ['errandOrderId'], { unique: true })
@Index('idx_errand_task_status_created', ['status', 'createdAt'])
@Index('idx_errand_task_rider', ['riderId', 'status'])
export class ErrandTask {
  @PrimaryGeneratedColumn({ name: 'errand_task_id', type: 'bigint' })
  errandTaskId!: string;

  @Column({ name: 'errand_order_id', type: 'bigint' })
  errandOrderId!: string;

  @Column({ type: 'varchar', length: 32, default: 'READY_FOR_DISPATCH' })
  status!: ErrandTaskStatus;

  @Column({ name: 'rider_id', type: 'bigint', nullable: true })
  riderId!: string | null;

  @Column({ name: 'dispatch_count', type: 'int', default: 0 })
  dispatchCount!: number;

  @Column({ name: 'price_increase', type: 'bigint', default: 0 })
  priceIncrease!: string;

  @Column({ name: 'pickup_address', type: 'json', nullable: true })
  pickupAddress!: ErrandAddressSnapshot | null;

  @Column({ name: 'delivery_address', type: 'json' })
  deliveryAddress!: ErrandAddressSnapshot;

  @Column({ name: 'distance_meters', type: 'int', default: 0 })
  distanceMeters!: number;

  @Column({ name: 'last_dispatched_at', type: 'bigint', nullable: true })
  lastDispatchedAt!: string | null;

  @Column({ name: 'assigned_at', type: 'bigint', nullable: true })
  assignedAt!: string | null;

  @Column({ name: 'picked_up_at', type: 'bigint', nullable: true })
  pickedUpAt!: string | null;

  @Column({ name: 'delivered_at', type: 'bigint', nullable: true })
  deliveredAt!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
