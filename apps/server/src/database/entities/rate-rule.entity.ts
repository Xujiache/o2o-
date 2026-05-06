import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RateRuleStatus = 'PENDING' | 'EFFECTIVE' | 'EXPIRED';
export type SettlementCycle = 'T1' | 'WEEKLY' | 'MONTHLY';

@Entity('rate_rule')
@Index('idx_rate_rule_city_effective', ['cityCode', 'effectiveAt'])
@Index('idx_rate_rule_status', ['status'])
export class RateRule {
  @PrimaryGeneratedColumn({ name: 'rate_rule_id', type: 'bigint' })
  rateRuleId!: string;

  @Column({ name: 'city_code', type: 'varchar', length: 20 })
  cityCode!: string;

  @Column({ name: 'category_id', type: 'bigint', nullable: true })
  categoryId!: string | null;

  @Column({ name: 'merchant_commission_rate', type: 'int', default: 0 })
  merchantCommissionRate!: number;

  @Column({ name: 'rider_service_fee', type: 'bigint', default: 0 })
  riderServiceFee!: string;

  @Column({ name: 'withdraw_fee_rate', type: 'int', default: 0 })
  withdrawFeeRate!: number;

  @Column({ name: 'settlement_cycle', type: 'varchar', length: 16, default: 'T1' })
  settlementCycle!: SettlementCycle;

  @Column({ name: 'effective_at', type: 'bigint' })
  effectiveAt!: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: RateRuleStatus;

  @Column({ name: 'operator_admin_id', type: 'bigint' })
  operatorAdminId!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
