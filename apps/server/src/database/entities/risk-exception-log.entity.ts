import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RiskExceptionBizType = 'FOOD' | 'ERRAND';
export type RiskExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type RiskExceptionStatus = 'OPEN' | 'HANDLED' | 'IGNORED';

@Entity('risk_exception_log')
@Index('idx_risk_exception_status', ['status'])
@Index('idx_risk_exception_biz', ['bizType', 'bizOrderId'])
export class RiskExceptionLog {
  @PrimaryGeneratedColumn({ name: 'log_id', type: 'bigint' })
  logId!: string;

  @Column({ name: 'exception_type', type: 'varchar', length: 40 })
  exceptionType!: string;

  @Column({ name: 'biz_type', type: 'varchar', length: 16 })
  bizType!: RiskExceptionBizType;

  @Column({ name: 'biz_order_id', type: 'bigint' })
  bizOrderId!: string;

  @Column({ type: 'varchar', length: 16, default: 'LOW' })
  severity!: RiskExceptionSeverity;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'OPEN' })
  status!: RiskExceptionStatus;

  @Column({ name: 'handler_admin_id', type: 'bigint', nullable: true })
  handlerAdminId!: string | null;

  @Column({ name: 'handled_at', type: 'bigint', nullable: true })
  handledAt!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
