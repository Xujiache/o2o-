import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

@Entity('store_delivery_area')
@Index('idx_store', ['storeId'])
export class StoreDeliveryArea {
  @PrimaryGeneratedColumn({ name: 'area_id', type: 'bigint' })
  areaId!: string;

  @Column({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ type: 'json' })
  geometry!: GeoJsonPolygon;

  @Column({ name: 'min_order_amount', type: 'bigint', default: 0 })
  minOrderAmount!: string;

  @Column({ name: 'delivery_fee', type: 'bigint', default: 0 })
  deliveryFee!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
