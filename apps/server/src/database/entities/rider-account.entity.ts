import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RiderAccountStatus = 'active' | 'disabled';

@Entity('rider_account')
@Index('uk_rider_mobile', ['mobile'], { unique: true })
@Index('idx_rider_status', ['accountStatus'])
export class RiderAccount {
  @PrimaryGeneratedColumn({ name: 'rider_id', type: 'bigint' })
  riderId!: string;

  @Column({ type: 'varchar', length: 20 })
  mobile!: string;

  @Column({
    name: 'account_status',
    type: 'enum',
    enum: ['active', 'disabled'],
    default: 'active',
  })
  accountStatus!: RiderAccountStatus;

  @Column({ name: 'real_name', type: 'varchar', length: 50, nullable: true })
  realName!: string | null;

  @Column({ name: 'id_card_no', type: 'varchar', length: 18, nullable: true })
  idCardNo!: string | null;

  @Column({ name: 'health_cert_no', type: 'varchar', length: 50, nullable: true })
  healthCertNo!: string | null;

  @Column({ name: 'health_cert_expiry', type: 'bigint', nullable: true })
  healthCertExpiry!: string | null;

  @Column({ name: 'approved_at', type: 'bigint', nullable: true })
  approvedAt!: string | null;

  @Column({ name: 'approved_application_id', type: 'bigint', nullable: true })
  approvedApplicationId!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;

  @Column({ name: 'deleted_at', type: 'bigint', nullable: true })
  deletedAt!: string | null;
}
