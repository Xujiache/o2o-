import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pickup_point')
@Index('idx_pickup_point_merchant', ['merchantId'])
@Index('idx_pickup_point_geohash', ['geohash'])
export class PickupPoint {
  @PrimaryGeneratedColumn({ name: 'pickup_point_id', type: 'bigint' })
  pickupPointId!: string;

  @Column({ name: 'merchant_id', type: 'bigint' })
  merchantId!: string;

  @Column({ name: 'store_id', type: 'bigint', nullable: true })
  storeId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 32 })
  province!: string;

  @Column({ type: 'varchar', length: 32 })
  city!: string;

  @Column({ type: 'varchar', length: 32 })
  district!: string;

  @Column({ type: 'varchar', length: 255 })
  address!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  lng!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  lat!: string;

  @Column({ type: 'varchar', length: 12 })
  geohash!: string;

  @Column({ type: 'tinyint', default: 1 })
  status!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
