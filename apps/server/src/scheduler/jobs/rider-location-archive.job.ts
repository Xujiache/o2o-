/**
 * RiderLocationArchiveJob:
 *   每日 3:00 删 rider_location WHERE reported_at < NOW-7d
 *   本阶段直接 DELETE,stage 8 升级为归档到 MongoDB
 */
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { RiderLocation } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60_000;

@Injectable()
export class RiderLocationArchiveJob extends BaseJob {
  readonly name = 'rider-location-archive';
  protected override lockTtlMs = 10 * 60_000;

  constructor(
    @InjectRepository(RiderLocation) private readonly locationRepo: Repository<RiderLocation>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 3 * * *', { name: 'rider-location-archive' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const cutoff = String(Date.now() - SEVEN_DAYS_MS);
    const result = await this.locationRepo.delete({ reportedAt: LessThan(cutoff) });
    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(`location archive: removed ${affected} rows older than 7 days`);
    } else {
      this.logger.debug('no rider_location rows to archive');
    }
  }
}
