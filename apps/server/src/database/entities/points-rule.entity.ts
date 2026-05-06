import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type PointsRuleBizType = 'FOOD' | 'ERRAND';
export type PointsRuleTrigger = 'ORDER_PAID' | 'ORDER_COMPLETED';

@Entity('points_rule')
export class PointsRule {
  @PrimaryGeneratedColumn({ name: 'points_rule_id', type: 'bigint' })
  pointsRuleId!: string;

  @Column({ name: 'rule_name', type: 'varchar', length: 100 })
  ruleName!: string;

  @Column({ name: 'biz_type', type: 'varchar', length: 16 })
  bizType!: PointsRuleBizType;

  @Column({ name: 'trigger_event', type: 'varchar', length: 32 })
  triggerEvent!: PointsRuleTrigger;

  @Column({ type: 'int' })
  points!: number;

  @Column({ type: 'tinyint', default: 1 })
  enabled!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
