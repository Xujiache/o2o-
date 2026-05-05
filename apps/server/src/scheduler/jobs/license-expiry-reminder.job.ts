/**
 * LicenseExpiryReminderJob:
 *   - 每日 8:00 扫 merchant_license expiry_date < NOW+7d 的资质,占位 push 通知
 * 周期:每日 8:00。
 */
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import { MerchantLicense } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

@Injectable()
export class LicenseExpiryReminderJob extends BaseJob {
  readonly name = 'license-expiry-reminder';
  protected override lockTtlMs = 5 * 60_000;

  constructor(
    @InjectRepository(MerchantLicense) private readonly repo: Repository<MerchantLicense>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 8 * * *', { name: 'license-expiry-reminder' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const today = new Date();
    const future = new Date(today.getTime() + 7 * 24 * 60 * 60_000);
    const fmt = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const rows = await this.repo.find({
      where: { expiryDate: Between(fmt(today), fmt(future)) },
      take: 200,
    });
    if (rows.length === 0) {
      this.logger.debug('no licenses expiring within 7 days');
      return;
    }
    for (const r of rows) {
      this.logger.warn(
        `[license-expiry] applicationId=${r.applicationId} type=${r.licenseType} expires=${r.expiryDate}`,
      );
    }
    this.logger.log(`license expiry reminder: ${rows.length} rows flagged`);
  }
}
