import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('trace_scan_log')
@Index('idx_trace_scan_log_qr_time', ['traceQrId', 'scannedAt'])
export class TraceScanLog {
  @PrimaryGeneratedColumn({ name: 'trace_scan_log_id', type: 'bigint' })
  traceScanLogId!: string;

  @Column({ name: 'trace_qr_id', type: 'bigint' })
  traceQrId!: string;

  @Column({ name: 'qr_code', type: 'varchar', length: 64 })
  qrCode!: string;

  @Column({ name: 'customer_id', type: 'bigint', nullable: true })
  customerId!: string | null;

  @Column({ name: 'client_ip', type: 'varchar', length: 45, nullable: true })
  clientIp!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ua!: string | null;

  @Column({ name: 'scanned_at', type: 'bigint' })
  scannedAt!: string;
}
