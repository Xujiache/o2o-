import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type TraceNodeType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface TraceAttachment {
  type: 'image' | 'pdf' | 'video' | 'file';
  fileId: string;
  url?: string;
  name?: string;
}

@Entity('trace_record')
@Index('idx_trace_record_qr_time', ['traceQrId', 'happenedAt'])
@Index('idx_trace_record_batch_time', ['traceBatchId', 'happenedAt'])
export class TraceRecord {
  @PrimaryGeneratedColumn({ name: 'trace_record_id', type: 'bigint' })
  traceRecordId!: string;

  @Column({ name: 'trace_qr_id', type: 'bigint', nullable: true })
  traceQrId!: string | null;

  @Column({ name: 'trace_batch_id', type: 'bigint' })
  traceBatchId!: string;

  @Column({ name: 'node_type', type: 'tinyint' })
  nodeType!: TraceNodeType;

  @Column({ name: 'node_title', type: 'varchar', length: 64 })
  nodeTitle!: string;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'json', nullable: true })
  attachments!: TraceAttachment[] | null;

  @Column({ name: 'happened_at', type: 'bigint' })
  happenedAt!: string;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true })
  operatorId!: string | null;

  @Column({ name: 'operator_name', type: 'varchar', length: 32, nullable: true })
  operatorName!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
