import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('errand_pricing')
@Index('uk_errand_pricing_city', ['cityCode'], { unique: true })
@Index('idx_errand_pricing_enabled', ['enabled'])
export class ErrandPricing {
  @PrimaryGeneratedColumn({ name: 'errand_pricing_id', type: 'bigint' })
  errandPricingId!: string;

  @Column({ name: 'city_code', type: 'varchar', length: 16, default: 'GLOBAL' })
  cityCode!: string;

  @Column({ name: 'base_fee', type: 'bigint', default: 0 })
  baseFee!: string;

  @Column({ name: 'distance_fee_per_km', type: 'bigint', default: 0 })
  distanceFeePerKm!: string;

  @Column({ name: 'urgent_standard_fee', type: 'bigint', default: 0 })
  urgentStandardFee!: string;

  @Column({ name: 'urgent_fast_fee', type: 'bigint', default: 0 })
  urgentFastFee!: string;

  @Column({ name: 'urgent_express_fee', type: 'bigint', default: 0 })
  urgentExpressFee!: string;

  @Column({ name: 'weight_extra_per_kg', type: 'bigint', default: 0 })
  weightExtraPerKg!: string;

  @Column({ name: 'min_distance_meters', type: 'int', default: 0 })
  minDistanceMeters!: number;

  @Column({ type: 'tinyint', default: 1 })
  enabled!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
