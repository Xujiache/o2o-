import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('track_point')
@Index('idx_track_point_task_recorded', ['riderTaskId', 'recordedAt'])
@Index('idx_track_point_rider_recorded', ['riderId', 'recordedAt'])
export class TrackPoint {
  @PrimaryGeneratedColumn({ name: 'track_point_id', type: 'bigint' })
  trackPointId!: string;

  @Column({ name: 'rider_task_id', type: 'bigint' })
  riderTaskId!: string;

  @Column({ name: 'rider_id', type: 'bigint' })
  riderId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  lng!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  lat!: string;

  @Column({ type: 'int', nullable: true })
  accuracy!: number | null;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  speed!: string | null;

  @Column({ name: 'recorded_at', type: 'bigint' })
  recordedAt!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
