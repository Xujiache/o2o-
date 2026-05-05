import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type DisableTargetAccountType = 'customer' | 'merchant' | 'rider';
export type DisableAction = 'disable' | 'enable';

@Entity('account_disable_record')
@Index('idx_disable_target', ['accountType', 'accountId', 'createdAt'])
@Index('idx_disable_operator', ['operatorAdminId', 'createdAt'])
export class AccountDisableRecord {
  @PrimaryGeneratedColumn({ name: 'account_disable_record_id', type: 'bigint' })
  accountDisableRecordId!: string;

  @Column({ name: 'account_type', type: 'varchar', length: 16 })
  accountType!: DisableTargetAccountType;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Column({ type: 'varchar', length: 16 })
  action!: DisableAction;

  @Column({ type: 'varchar', length: 512, nullable: true })
  reason!: string | null;

  @Column({ name: 'operator_admin_id', type: 'bigint' })
  operatorAdminId!: string;

  @Column({ name: 'operator_username', type: 'varchar', length: 64 })
  operatorUsername!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
