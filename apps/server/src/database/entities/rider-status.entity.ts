import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RiderOnlineStatus = 'online' | 'offline' | 'busy';
export type RiderPlatform = 'android' | 'ios';

@Entity('rider_status')
@Index('uk_rider_status', ['riderId'], { unique: true })
@Index('idx_rider_online_heartbeat', ['onlineStatus', 'lastHeartbeatAt'])
export class RiderStatus {
  @PrimaryGeneratedColumn({ name: 'status_id', type: 'bigint' })
  statusId!: string;

  @Column({ name: 'rider_id', type: 'bigint' })
  riderId!: string;

  @Column({
    name: 'online_status',
    type: 'enum',
    enum: ['online', 'offline', 'busy'],
    default: 'offline',
  })
  onlineStatus!: RiderOnlineStatus;

  @Column({ name: 'current_lng', type: 'decimal', precision: 10, scale: 6, nullable: true })
  currentLng!: string | null;

  @Column({ name: 'current_lat', type: 'decimal', precision: 10, scale: 6, nullable: true })
  currentLat!: string | null;

  @Column({ name: 'last_heartbeat_at', type: 'bigint', nullable: true })
  lastHeartbeatAt!: string | null;

  @Column({ name: 'device_token', type: 'varchar', length: 255, nullable: true })
  deviceToken!: string | null;

  @Column({ type: 'enum', enum: ['android', 'ios'], nullable: true })
  platform!: RiderPlatform | null;

  @Column({ name: 'credit_score', type: 'int', default: 100 })
  creditScore!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
