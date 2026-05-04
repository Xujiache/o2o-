import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type DomainEventStatus = 'pending' | 'processing' | 'done' | 'retrying' | 'failed';

/**
 * 领域事件持久化(T24)— 5 个事件:
 * ConfigChanged / PermissionChanged / FileUploaded / ThirdPartyCallbackReceived / AuditLogCreated
 * 事件总线先用 @nestjs/event-emitter 进程内,失败时落本表 + ThirdPartyRetryJob 重试。
 */
@Entity('domain_event')
@Index('idx_event_status_retry', ['status', 'nextRetryAt'])
@Index('idx_event_biz', ['bizType', 'bizId'])
export class DomainEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'event_id', type: 'varchar', length: 64, unique: true })
  eventId!: string;

  @Column({ name: 'biz_type', type: 'varchar', length: 64 })
  bizType!: string;

  @Column({ name: 'biz_id', type: 'varchar', length: 128, nullable: true })
  bizId!: string | null;

  @Column({ type: 'json', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ type: 'enum', enum: ['pending', 'processing', 'done', 'retrying', 'failed'], default: 'pending' })
  status!: DomainEventStatus;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;

  @Column({ name: 'error_message', type: 'varchar', length: 1024, nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'next_retry_at', type: 'bigint', nullable: true })
  nextRetryAt!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
