import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type DispatchRuleBizType = 'FOOD' | 'ERRAND';

@Entity('dispatch_rule')
@Index('idx_dispatch_rule_city_biz', ['cityCode', 'bizType'])
export class DispatchRule {
  @PrimaryGeneratedColumn({ name: 'dispatch_rule_id', type: 'bigint' })
  dispatchRuleId!: string;

  @Column({ name: 'rule_name', type: 'varchar', length: 100 })
  ruleName!: string;

  @Column({ name: 'city_code', type: 'varchar', length: 20 })
  cityCode!: string;

  @Column({ name: 'biz_type', type: 'varchar', length: 16 })
  bizType!: DispatchRuleBizType;

  @Column({ type: 'varchar', length: 40 })
  algorithm!: string;

  @Column({ type: 'json', nullable: true })
  config!: Record<string, unknown> | null;

  @Column({ type: 'tinyint', default: 1 })
  enabled!: number;

  @Column({ name: 'created_by', type: 'bigint' })
  createdBy!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
