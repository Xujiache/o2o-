import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export interface AssessmentBadge {
  code: string;
  label: string;
  awardedAt: number;
}

@Entity('rider_assessment')
@Index('uk_rider_assessment_rider_period', ['riderId', 'period'], { unique: true })
@Index('idx_rider_assessment_period', ['period'])
export class RiderAssessment {
  @PrimaryGeneratedColumn({ name: 'rider_assessment_id', type: 'bigint' })
  riderAssessmentId!: string;

  @Column({ name: 'rider_id', type: 'bigint' })
  riderId!: string;

  @Column({ type: 'int' })
  period!: number;

  @Column({ name: 'on_time_rate', type: 'decimal', precision: 5, scale: 4, default: 0 })
  onTimeRate!: string;

  @Column({ name: 'accept_rate', type: 'decimal', precision: 5, scale: 4, default: 0 })
  acceptRate!: string;

  @Column({ name: 'complaint_rate', type: 'decimal', precision: 5, scale: 4, default: 0 })
  complaintRate!: string;

  @Column({ name: 'avg_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  avgRating!: string;

  @Column({ name: 'rank_in_city', type: 'int', nullable: true })
  rankInCity!: number | null;

  @Column({ name: 'badges_json', type: 'json', nullable: true })
  badgesJson!: AssessmentBadge[] | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
