import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RiderVehicleType = 'electric_bike' | 'motorcycle' | 'car';
export type RiderVehicleStatus = 'active' | 'inactive';

@Entity('rider_vehicle')
@Index('idx_rider_vehicle', ['riderId'])
export class RiderVehicle {
  @PrimaryGeneratedColumn({ name: 'vehicle_id', type: 'bigint' })
  vehicleId!: string;

  @Column({ name: 'rider_id', type: 'bigint' })
  riderId!: string;

  @Column({
    name: 'vehicle_type',
    type: 'enum',
    enum: ['electric_bike', 'motorcycle', 'car'],
  })
  vehicleType!: RiderVehicleType;

  @Column({ name: 'plate_no', type: 'varchar', length: 20, nullable: true })
  plateNo!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  brand!: string | null;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status!: RiderVehicleStatus;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
