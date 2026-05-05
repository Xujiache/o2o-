import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import type { ProhibitedWarning } from './errand-quote.entity';

export interface ErrandPriceSnapshotPayload {
  typeCode: 'BUY' | 'DELIVER' | 'HELP' | 'CUSTOM';
  distanceMeters: number;
  baseFee: string;
  distanceFee: string;
  urgentFee: string;
  payableAmount: string;
  urgentLevel: 'standard' | 'fast' | 'express';
  weight: string | null;
  budget: string | null;
  prohibitedWarnings: ProhibitedWarning[];
}

@Entity('errand_price_snapshot')
@Index('uk_errand_price_snapshot_order', ['errandOrderId'], { unique: true })
export class ErrandPriceSnapshot {
  @PrimaryGeneratedColumn({ name: 'errand_price_snapshot_id', type: 'bigint' })
  errandPriceSnapshotId!: string;

  @Column({ name: 'errand_order_id', type: 'bigint' })
  errandOrderId!: string;

  @Column({ name: 'quote_id', type: 'bigint' })
  quoteId!: string;

  @Column({ type: 'json' })
  payload!: ErrandPriceSnapshotPayload;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
