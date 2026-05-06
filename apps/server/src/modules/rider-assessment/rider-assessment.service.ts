import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RiderAssessment } from '../../database/entities';

import type { AssessmentQueryDto, AssessmentVo } from './rider-assessment.dto';

function currentPeriod(): number {
  const d = new Date();
  return Number(`${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}`);
}

@Injectable()
export class RiderAssessmentService {
  constructor(@InjectRepository(RiderAssessment) private readonly assessmentRepo: Repository<RiderAssessment>) {}

  async query(riderId: string, q: AssessmentQueryDto): Promise<AssessmentVo> {
    const period = q.period ?? currentPeriod();
    const row = await this.assessmentRepo.findOne({ where: { riderId, period } });
    if (!row) {
      return {
        period,
        onTimeRate: '0',
        acceptRate: '0',
        complaintRate: '0',
        avgRating: '0',
        rankInCity: null,
        badges: [],
      };
    }
    return {
      period: Number(row.period),
      onTimeRate: row.onTimeRate,
      acceptRate: row.acceptRate,
      complaintRate: row.complaintRate,
      avgRating: row.avgRating,
      rankInCity: row.rankInCity,
      badges: row.badgesJson ?? [],
    };
  }
}
