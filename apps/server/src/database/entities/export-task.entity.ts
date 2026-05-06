import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ExportTaskStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

@Entity('export_task')
@Index('idx_export_task_no', ['exportNo'], { unique: true })
@Index('idx_export_task_status', ['status'])
export class ExportTask {
  @PrimaryGeneratedColumn({ name: 'export_task_id', type: 'bigint' })
  exportTaskId!: string;

  @Column({ name: 'export_no', type: 'varchar', length: 40 })
  exportNo!: string;

  @Column({ name: 'export_type', type: 'varchar', length: 40 })
  exportType!: string;

  @Column({ name: 'query_params', type: 'json', nullable: true })
  queryParams!: Record<string, unknown> | null;

  @Column({ name: 'operator_admin_id', type: 'bigint' })
  operatorAdminId!: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: ExportTaskStatus;

  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl!: string | null;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'row_count', type: 'int', nullable: true })
  rowCount!: number | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
