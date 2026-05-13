import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pickup_time_slot')
@Index('uk_pickup_slot_unique', ['pickupPointId', 'slotDate', 'startMinute'], { unique: true })
@Index('idx_pickup_slot_date', ['slotDate'])
export class PickupTimeSlot {
  @PrimaryGeneratedColumn({ name: 'slot_id', type: 'bigint' })
  slotId!: string;

  @Column({ name: 'pickup_point_id', type: 'bigint' })
  pickupPointId!: string;

  @Column({ name: 'slot_date', type: 'date' })
  slotDate!: string;

  @Column({ name: 'start_minute', type: 'smallint' })
  startMinute!: number;

  @Column({ name: 'end_minute', type: 'smallint' })
  endMinute!: number;

  @Column({ type: 'int' })
  capacity!: number;

  @Column({ type: 'int', default: 0 })
  reserved!: number;

  @Column({ type: 'tinyint', default: 1 })
  status!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
