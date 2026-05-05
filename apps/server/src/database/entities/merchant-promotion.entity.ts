import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PromoType = 'time_limited' | 'single_full_off';
export type PromoStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'ended';

export interface TimeLimitedRules {
  discountType: 'percent' | 'fixed';
  discountValue: number;
}

export interface SingleFullOffRules {
  tiers: Array<{ minAmount: number; offAmount: number }>;
}

export type PromoRules = TimeLimitedRules | SingleFullOffRules;

@Entity('merchant_promotion')
@Index('idx_store_promo_status', ['storeId', 'status'])
@Index('idx_active_window', ['status', 'startTime', 'endTime'])
export class MerchantPromotion {
  @PrimaryGeneratedColumn({ name: 'promo_id', type: 'bigint' })
  promoId!: string;

  @Column({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ name: 'promo_type', type: 'enum', enum: ['time_limited', 'single_full_off'] })
  promoType!: PromoType;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ name: 'product_ids', type: 'json' })
  productIds!: string[];

  @Column({ type: 'json' })
  rules!: PromoRules;

  @Column({ name: 'start_time', type: 'bigint' })
  startTime!: string;

  @Column({ name: 'end_time', type: 'bigint' })
  endTime!: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'scheduled', 'active', 'paused', 'ended'],
    default: 'draft',
  })
  status!: PromoStatus;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
