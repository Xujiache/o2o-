import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type IntegrationRequestStatus = 'pending' | 'success' | 'failed' | 'retrying';

/**
 * 第三方调用日志(简化版 — T23 新增)。
 * 记录每次第三方调用的请求/响应/状态,失败时由 ThirdPartyRetryJob 扫描补偿重试。
 */
@Entity('integration_request_log')
@Index('idx_irl_status_next_retry', ['status', 'nextRetryAt'])
@Index('idx_irl_provider_request_id', ['provider', 'requestId'], { unique: true })
export class IntegrationRequestLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  provider!: string;

  @Column({ name: 'request_id', type: 'varchar', length: 64 })
  requestId!: string;

  @Column({ type: 'varchar', length: 256 })
  endpoint!: string;

  @Column({ name: 'request_payload', type: 'mediumtext', nullable: true })
  requestPayload!: string | null;

  @Column({ name: 'response_payload', type: 'mediumtext', nullable: true })
  responsePayload!: string | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'success', 'failed', 'retrying'],
    default: 'pending',
  })
  status!: IntegrationRequestStatus;

  @Column({ name: 'error_message', type: 'varchar', length: 512, nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;

  @Column({ name: 'next_retry_at', type: 'bigint', nullable: true })
  nextRetryAt!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
