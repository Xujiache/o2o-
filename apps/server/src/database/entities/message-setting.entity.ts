import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('message_setting')
export class MessageSetting {
  @PrimaryColumn({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ name: 'order_notify', type: 'tinyint', default: 1 })
  orderNotify!: number;

  @Column({ name: 'activity_notify', type: 'tinyint', default: 1 })
  activityNotify!: number;

  @Column({ name: 'sms_notify', type: 'tinyint', default: 1 })
  smsNotify!: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
