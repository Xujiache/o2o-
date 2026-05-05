import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RiderCertType =
  | 'id_card_front'
  | 'id_card_back'
  | 'face_video'
  | 'health_cert'
  | 'driver_license'
  | 'vehicle_license';

@Entity('rider_certificate')
@Index('uk_rider_cert_app_type', ['applicationId', 'certType'], { unique: true })
export class RiderCertificate {
  @PrimaryGeneratedColumn({ name: 'certificate_id', type: 'bigint' })
  certificateId!: string;

  @Column({ name: 'application_id', type: 'bigint' })
  applicationId!: string;

  @Column({
    name: 'cert_type',
    type: 'enum',
    enum: ['id_card_front', 'id_card_back', 'face_video', 'health_cert', 'driver_license', 'vehicle_license'],
  })
  certType!: RiderCertType;

  @Column({ name: 'file_object_id', type: 'varchar', length: 64 })
  fileObjectId!: string;

  @Column({ type: 'json', nullable: true })
  extra!: Record<string, unknown> | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
