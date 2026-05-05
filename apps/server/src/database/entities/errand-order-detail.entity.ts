import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export interface ErrandAddressSnapshot {
  address: string;
  name?: string;
  mobile?: string;
  lng?: number;
  lat?: number;
}

@Entity('errand_order_detail')
@Index('uk_errand_order_detail_order', ['errandOrderId'], { unique: true })
export class ErrandOrderDetail {
  @PrimaryGeneratedColumn({ name: 'errand_order_detail_id', type: 'bigint' })
  errandOrderDetailId!: string;

  @Column({ name: 'errand_order_id', type: 'bigint' })
  errandOrderId!: string;

  @Column({ name: 'pickup_address', type: 'json', nullable: true })
  pickupAddress!: ErrandAddressSnapshot | null;

  @Column({ name: 'delivery_address', type: 'json' })
  deliveryAddress!: ErrandAddressSnapshot;

  @Column({ name: 'item_desc', type: 'text', nullable: true })
  itemDesc!: string | null;

  @Column({ name: 'task_desc', type: 'text', nullable: true })
  taskDesc!: string | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  weight!: string | null;

  @Column({ name: 'distance_meters', type: 'int', default: 0 })
  distanceMeters!: number;

  @Column({ type: 'varchar', length: 512, nullable: true })
  remark!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
