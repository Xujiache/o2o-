import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type IdempotencyStatus = 'processing' | 'done' | 'failed';

@Entity('idempotency_record')
@Index('idx_idem_expire', ['expireAt'])
export class IdempotencyRecord {
  @PrimaryColumn({ name: 'idempotency_key', type: 'varchar', length: 128 })
  idempotencyKey!: string;

  @PrimaryColumn({ type: 'varchar', length: 64 })
  scope!: string;

  @Column({ name: 'request_hash', type: 'varchar', length: 128 })
  requestHash!: string;

  @Column({ name: 'response_payload', type: 'mediumtext', nullable: true })
  responsePayload!: string | null;

  @Column({ type: 'enum', enum: ['processing', 'done', 'failed'] })
  status!: IdempotencyStatus;

  @Column({ name: 'expire_at', type: 'bigint' })
  expireAt!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
