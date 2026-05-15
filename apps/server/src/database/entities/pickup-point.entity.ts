import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 自提点(GR-1 新增)
 *
 * 平台自营生鲜全自提模式下,用户下单时按距离选择自提点;
 * 运营员在该自提点完成拣货+称重+核销自提码。
 *
 * status:
 *  - active   : 正常营业,对用户可见,可下单
 *  - suspended: 临时停业(节假日休息等),对用户灰显不可下单
 *  - offline  : 已下线(软删除),对用户完全不可见
 */
@Entity('pickup_point')
@Index('idx_pickup_point_status', ['status'])
@Index('idx_pickup_point_city', ['cityCode'])
export class PickupPoint {
  @PrimaryGeneratedColumn({ name: 'pickup_point_id', type: 'bigint' })
  pickupPointId!: string;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  address!: string;

  @Column({ name: 'city_code', type: 'varchar', length: 16, nullable: true })
  cityCode!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  lng!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  lat!: string;

  @Column({ name: 'business_hour_start', type: 'varchar', length: 5, default: '09:00' })
  businessHourStart!: string;

  @Column({ name: 'business_hour_end', type: 'varchar', length: 5, default: '21:00' })
  businessHourEnd!: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 32, nullable: true })
  contactPhone!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status!: 'active' | 'suspended' | 'offline';

  @Column({ type: 'varchar', length: 255, nullable: true })
  notice!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
