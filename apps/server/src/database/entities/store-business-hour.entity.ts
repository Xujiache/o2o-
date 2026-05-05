import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('store_business_hour')
@Index('idx_store', ['storeId', 'dayOfWeek'])
export class StoreBusinessHour {
  @PrimaryGeneratedColumn({ name: 'record_id', type: 'bigint' })
  recordId!: string;

  @Column({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ name: 'day_of_week', type: 'tinyint' })
  dayOfWeek!: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime!: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime!: string;
}
