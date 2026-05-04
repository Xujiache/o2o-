import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type FileOwnerType = 'customer' | 'merchant' | 'rider' | 'admin';

@Entity('file_object')
@Index('idx_file_owner', ['ownerType', 'ownerId'])
@Index('idx_file_biz', ['bizType'])
export class FileObject {
  @PrimaryColumn({ name: 'file_id', type: 'varchar', length: 64 })
  fileId!: string;

  @Column({ name: 'biz_type', type: 'varchar', length: 64 })
  bizType!: string;

  @Column({ name: 'owner_type', type: 'enum', enum: ['customer', 'merchant', 'rider', 'admin'] })
  ownerType!: FileOwnerType;

  @Column({ name: 'owner_id', type: 'bigint' })
  ownerId!: string;

  @Column({ name: 'storage_provider', type: 'varchar', length: 32, default: 'minio' })
  storageProvider!: string;

  @Column({ type: 'varchar', length: 128 })
  bucket!: string;

  @Column({ name: 'object_key', type: 'varchar', length: 512 })
  objectKey!: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  url!: string | null;

  @Column({ name: 'content_type', type: 'varchar', length: 128, nullable: true })
  contentType!: string | null;

  @Column({ type: 'bigint', nullable: true })
  size!: string | null;

  @Column({ name: 'expire_at', type: 'bigint', nullable: true })
  expireAt!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
