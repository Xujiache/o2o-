import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type MerchantAccountStatus = 'pending' | 'active' | 'disabled';

@Entity('merchant_account')
@Index('uk_merchant_mobile', ['mobile'], { unique: true })
@Index('idx_merchant_status', ['accountStatus'])
export class MerchantAccount {
  @PrimaryGeneratedColumn({ name: 'merchant_id', type: 'bigint' })
  merchantId!: string;

  @Column({ type: 'varchar', length: 20 })
  mobile!: string;

  @Column({
    name: 'account_status',
    type: 'enum',
    enum: ['pending', 'active', 'disabled'],
    default: 'pending',
  })
  accountStatus!: MerchantAccountStatus;

  @Column({ name: 'latest_application_id', type: 'bigint', nullable: true })
  latestApplicationId!: string | null;

  @Column({ name: 'approved_store_id', type: 'bigint', nullable: true })
  approvedStoreId!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
