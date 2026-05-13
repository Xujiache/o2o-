import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type CouponType = 'AMOUNT' | 'DISCOUNT';
export type CouponBizType = 'FOOD' | 'ERRAND' | 'GROCERY' | 'ALL';
export type CouponRuleStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'DISABLED';

@Entity('coupon_rule')
@Index('idx_coupon_rule_status_valid', ['status', 'validTo'])
export class CouponRule {
  @PrimaryGeneratedColumn({ name: 'coupon_rule_id', type: 'bigint' })
  couponRuleId!: string;

  @Column({ name: 'coupon_name', type: 'varchar', length: 100 })
  couponName!: string;

  @Column({ name: 'coupon_type', type: 'varchar', length: 16 })
  couponType!: CouponType;

  @Column({ name: 'biz_type', type: 'varchar', length: 16 })
  bizType!: CouponBizType;

  @Column({ type: 'bigint', default: 0 })
  threshold!: string;

  @Column({ type: 'bigint' })
  discount!: string;

  @Column({ name: 'total_stock', type: 'int', default: 0 })
  totalStock!: number;

  @Column({ name: 'remain_stock', type: 'int', default: 0 })
  remainStock!: number;

  @Column({ name: 'valid_from', type: 'bigint' })
  validFrom!: string;

  @Column({ name: 'valid_to', type: 'bigint' })
  validTo!: string;

  @Column({ type: 'varchar', length: 16, default: 'DRAFT' })
  status!: CouponRuleStatus;

  @Column({ name: 'created_by', type: 'bigint' })
  createdBy!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
