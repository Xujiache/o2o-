import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('dashboard_snapshot')
@Index('idx_dashboard_snapshot_date_city', ['snapshotDate', 'cityCode'], { unique: true })
export class DashboardSnapshot {
  @PrimaryGeneratedColumn({ name: 'snapshot_id', type: 'bigint' })
  snapshotId!: string;

  @Column({ name: 'snapshot_date', type: 'varchar', length: 10 })
  snapshotDate!: string;

  @Column({ name: 'city_code', type: 'varchar', length: 20 })
  cityCode!: string;

  @Column({ type: 'bigint', default: 0 })
  gmv!: string;

  @Column({ name: 'order_count', type: 'int', default: 0 })
  orderCount!: number;

  @Column({ name: 'active_users', type: 'int', default: 0 })
  activeUsers!: number;

  @Column({ name: 'online_riders', type: 'int', default: 0 })
  onlineRiders!: number;

  @Column({ name: 'exception_orders', type: 'int', default: 0 })
  exceptionOrders!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
