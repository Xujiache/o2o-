import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

export type ProviderStatus = 'active' | 'disabled' | 'error';

@Entity('third_party_config')
@Unique('uk_provider_env', ['provider', 'env'])
export class ThirdPartyConfig {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  provider!: string;

  @Column({ type: 'varchar', length: 16 })
  env!: string;

  @Column({ name: 'encrypted_secret', type: 'text', nullable: true })
  encryptedSecret!: string | null;

  @Column({ type: 'enum', enum: ['active', 'disabled', 'error'], default: 'disabled' })
  status!: ProviderStatus;

  @Column({ name: 'last_health_at', type: 'bigint', nullable: true })
  lastHealthAt!: string | null;

  @Column({ name: 'error_message', type: 'varchar', length: 1024, nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
