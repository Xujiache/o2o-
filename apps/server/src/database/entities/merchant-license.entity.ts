import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type MerchantLicenseType =
  | 'business_license'
  | 'food_permit'
  | 'legal_id_card_front'
  | 'legal_id_card_back'
  | 'store_photo';

@Entity('merchant_license')
@Index('idx_application_type', ['applicationId', 'licenseType'])
@Index('idx_expiry', ['expiryDate'])
export class MerchantLicense {
  @PrimaryGeneratedColumn({ name: 'license_id', type: 'bigint' })
  licenseId!: string;

  @Column({ name: 'application_id', type: 'bigint' })
  applicationId!: string;

  @Column({
    name: 'license_type',
    type: 'enum',
    enum: ['business_license', 'food_permit', 'legal_id_card_front', 'legal_id_card_back', 'store_photo'],
  })
  licenseType!: MerchantLicenseType;

  @Column({ name: 'file_id', type: 'varchar', length: 64 })
  fileId!: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
