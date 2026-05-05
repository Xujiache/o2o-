import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('rider_location')
@Index('idx_rider_location_rider_reported', ['riderId', 'reportedAt'])
@Index('idx_rider_location_reported', ['reportedAt'])
export class RiderLocation {
  @PrimaryGeneratedColumn({ name: 'location_id', type: 'bigint' })
  locationId!: string;

  @Column({ name: 'rider_id', type: 'bigint' })
  riderId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  lng!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  lat!: string;

  @Column({ type: 'int', nullable: true })
  accuracy!: number | null;

  @Column({ name: 'batch_id', type: 'varchar', length: 64 })
  batchId!: string;

  @Column({ name: 'reported_at', type: 'bigint' })
  reportedAt!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
