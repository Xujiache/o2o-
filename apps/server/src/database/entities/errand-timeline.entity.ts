import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ErrandTimelineEventType =
  | 'CREATED'
  | 'PAID'
  | 'DISPATCHING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REMARK_ADDED'
  | 'URGENT'
  | 'PRICE_INCREASED'
  | 'REFUNDED';

@Entity('errand_timeline')
@Index('idx_errand_timeline_order', ['errandOrderId', 'createdAt'])
export class ErrandTimeline {
  @PrimaryGeneratedColumn({ name: 'errand_timeline_id', type: 'bigint' })
  errandTimelineId!: string;

  @Column({ name: 'errand_order_id', type: 'bigint' })
  errandOrderId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 32 })
  eventType!: ErrandTimelineEventType;

  @Column({ type: 'json', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 16, default: 'system' })
  operator!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
