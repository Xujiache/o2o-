import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type StoreBusinessStatus = 'online' | 'offline' | 'paused';

@Entity('store')
@Index('uk_store_merchant', ['merchantId'], { unique: true })
@Index('idx_store_status', ['businessStatus', 'cityCode'])
export class Store {
  @PrimaryGeneratedColumn({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ name: 'merchant_id', type: 'bigint' })
  merchantId!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ name: 'avatar_file_id', type: 'varchar', length: 64, nullable: true })
  avatarFileId!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  intro!: string | null;

  @Column({ name: 'business_scope', type: 'varchar', length: 255 })
  businessScope!: string;

  @Column({
    name: 'business_status',
    type: 'enum',
    enum: ['online', 'offline', 'paused'],
    default: 'offline',
  })
  businessStatus!: StoreBusinessStatus;

  @Column({ name: 'min_order_amount', type: 'bigint', default: 0 })
  minOrderAmount!: string;

  @Column({ name: 'delivery_fee', type: 'bigint', default: 0 })
  deliveryFee!: string;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 4, nullable: true })
  commissionRate!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notice!: string | null;

  @Column({ name: 'city_code', type: 'varchar', length: 20, nullable: true })
  cityCode!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
