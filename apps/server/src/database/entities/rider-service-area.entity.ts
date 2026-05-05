import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import type { GeoJsonPolygon } from './store-delivery-area.entity';

@Entity('rider_service_area')
@Index('uk_rider_service_area', ['riderId'], { unique: true })
export class RiderServiceArea {
  @PrimaryGeneratedColumn({ name: 'service_area_id', type: 'bigint' })
  serviceAreaId!: string;

  @Column({ name: 'rider_id', type: 'bigint' })
  riderId!: string;

  @Column({ type: 'json' })
  geometry!: GeoJsonPolygon;

  @Column({ name: 'max_concurrent_orders', type: 'int', default: 3 })
  maxConcurrentOrders!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
