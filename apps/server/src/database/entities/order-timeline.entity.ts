import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import type { FoodOrderStatus } from './food-order.entity';

export type OrderTimelineBizType = 'FOOD' | 'ERRAND';
export type OrderTimelineActorType = 'customer' | 'merchant' | 'rider' | 'admin' | 'system';

@Entity('order_timeline')
@Index('idx_order_timeline_order_created', ['orderId', 'createdAt'])
export class OrderTimeline {
  @PrimaryGeneratedColumn({ name: 'order_timeline_id', type: 'bigint' })
  orderTimelineId!: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId!: string;

  @Column({ name: 'biz_type', type: 'varchar', length: 16, default: 'FOOD' })
  bizType!: OrderTimelineBizType;

  @Column({ name: 'from_status', type: 'varchar', length: 32, nullable: true })
  fromStatus!: FoodOrderStatus | null;

  @Column({ name: 'to_status', type: 'varchar', length: 32 })
  toStatus!: FoodOrderStatus;

  @Column({ name: 'actor_type', type: 'varchar', length: 16 })
  actorType!: OrderTimelineActorType;

  @Column({ name: 'actor_id', type: 'varchar', length: 64, nullable: true })
  actorId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
