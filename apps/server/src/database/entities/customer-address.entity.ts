import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('customer_address')
@Index('idx_user_default', ['userId', 'isDefault', 'updatedAt'])
export class CustomerAddress {
  @PrimaryGeneratedColumn({ name: 'address_id', type: 'bigint' })
  addressId!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ name: 'receiver_name', type: 'varchar', length: 50 })
  receiverName!: string;

  @Column({ type: 'varchar', length: 20 })
  mobile!: string;

  @Column({ name: 'city_code', type: 'varchar', length: 20 })
  cityCode!: string;

  @Column({ type: 'varchar', length: 255 })
  detail!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat!: string;

  @Column({ name: 'is_default', type: 'tinyint', default: 0 })
  isDefault!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
