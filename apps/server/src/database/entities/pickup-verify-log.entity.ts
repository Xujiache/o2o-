import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pickup_verify_log')
@Index('idx_pickup_verify_log_order', ['groceryOrderId'])
@Index('idx_pickup_verify_log_operator_time', ['operatorId', 'createdAt'])
export class PickupVerifyLog {
  @PrimaryGeneratedColumn({ name: 'verify_log_id', type: 'bigint' })
  verifyLogId!: string;

  @Column({ name: 'grocery_order_id', type: 'bigint', nullable: true })
  groceryOrderId!: string | null;

  @Column({ name: 'order_no', type: 'varchar', length: 32 })
  orderNo!: string;

  @Column({ name: 'pickup_point_id', type: 'bigint' })
  pickupPointId!: string;

  @Column({ name: 'operator_id', type: 'bigint' })
  operatorId!: string;

  @Column({ name: 'operator_name', type: 'varchar', length: 32, nullable: true })
  operatorName!: string | null;

  @Column({ name: 'verify_method', type: 'tinyint' })
  verifyMethod!: number;

  @Column({ type: 'tinyint' })
  result!: number;

  @Column({ name: 'fail_reason', type: 'varchar', length: 255, nullable: true })
  failReason!: string | null;

  @Column({ name: 'client_ip', type: 'varchar', length: 45, nullable: true })
  clientIp!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
