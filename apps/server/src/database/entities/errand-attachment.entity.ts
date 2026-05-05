import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('errand_attachment')
@Index('idx_errand_attachment_order', ['errandOrderId', 'sort'])
export class ErrandAttachment {
  @PrimaryGeneratedColumn({ name: 'errand_attachment_id', type: 'bigint' })
  errandAttachmentId!: string;

  @Column({ name: 'errand_order_id', type: 'bigint' })
  errandOrderId!: string;

  @Column({ name: 'file_id', type: 'bigint' })
  fileId!: string;

  @Column({ type: 'int', default: 0 })
  sort!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
