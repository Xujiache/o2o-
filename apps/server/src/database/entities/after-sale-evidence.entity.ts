import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AfterSaleEvidenceSource = 'USER' | 'MERCHANT';

@Entity('after_sale_evidence')
@Index('idx_after_sale_evidence_main', ['afterSaleId', 'createdAt'])
export class AfterSaleEvidence {
  @PrimaryGeneratedColumn({ name: 'after_sale_evidence_id', type: 'bigint' })
  afterSaleEvidenceId!: string;

  @Column({ name: 'after_sale_id', type: 'bigint' })
  afterSaleId!: string;

  @Column({ name: 'file_id', type: 'bigint' })
  fileId!: string;

  @Column({ type: 'varchar', length: 16 })
  source!: AfterSaleEvidenceSource;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
