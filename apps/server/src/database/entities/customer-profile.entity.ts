import { Column, Entity, PrimaryColumn } from 'typeorm';

export type CustomerGender = 'unknown' | 'male' | 'female';

@Entity('customer_profile')
export class CustomerProfile {
  @PrimaryColumn({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ type: 'varchar', length: 64 })
  nickname!: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'enum', enum: ['unknown', 'male', 'female'], default: 'unknown' })
  gender!: CustomerGender;

  @Column({ type: 'date', nullable: true })
  birthday!: string | null;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
