import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RiderEarningStatus = 'PENDING' | 'READY' | 'PAID';

@Entity('rider_earning')
@Index('uk_rider_earning_rider_date', ['riderId', 'settleDate'], { unique: true })
@Index('idx_rider_earning_status', ['status', 'createdAt'])
export class RiderEarning {
  @PrimaryGeneratedColumn({ name: 'rider_earning_id', type: 'bigint' })
  riderEarningId!: string;

  @Column({ name: 'rider_id', type: 'bigint' })
  riderId!: string;

  @Column({ name: 'settle_date', type: 'int' })
  settleDate!: number;

  @Column({ name: 'order_count', type: 'int', default: 0 })
  orderCount!: number;

  @Column({ name: 'base_amount', type: 'bigint', default: 0 })
  baseAmount!: string;

  @Column({ name: 'distance_amount', type: 'bigint', default: 0 })
  distanceAmount!: string;

  @Column({ name: 'timely_bonus', type: 'bigint', default: 0 })
  timelyBonus!: string;

  @Column({ name: 'reward_amount', type: 'bigint', default: 0 })
  rewardAmount!: string;

  @Column({ name: 'deduct_amount', type: 'bigint', default: 0 })
  deductAmount!: string;

  @Column({ name: 'total_amount', type: 'bigint', default: 0 })
  totalAmount!: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: RiderEarningStatus;

  @Column({ name: 'settled_at', type: 'bigint', nullable: true })
  settledAt!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
