import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import type { GeoJsonPolygon } from './store-delivery-area.entity';

@Entity('city_site')
@Index('uk_city_site_code', ['cityCode'], { unique: true })
@Index('idx_city_site_enabled_order', ['serviceEnabled', 'displayOrder'])
export class CitySite {
  @PrimaryGeneratedColumn({ name: 'city_site_id', type: 'bigint' })
  citySiteId!: string;

  @Column({ name: 'city_code', type: 'varchar', length: 16 })
  cityCode!: string;

  @Column({ name: 'city_name', type: 'varchar', length: 64 })
  cityName!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  province!: string | null;

  @Column({ name: 'service_enabled', type: 'tinyint', default: 1 })
  serviceEnabled!: number;

  @Column({ name: 'service_area', type: 'json', nullable: true })
  serviceArea!: GeoJsonPolygon | null;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
