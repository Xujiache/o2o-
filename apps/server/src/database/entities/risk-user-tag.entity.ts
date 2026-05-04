import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RiskTagType = 'high_value_blocked' | 'suspect_fraud' | 'blacklist';

@Entity('risk_user_tag')
@Index('idx_user_tag', ['userId', 'tagType'])
export class RiskUserTag {
  @PrimaryGeneratedColumn({ name: 'tag_id', type: 'bigint' })
  tagId!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ name: 'tag_type', type: 'varchar', length: 40 })
  tagType!: RiskTagType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
