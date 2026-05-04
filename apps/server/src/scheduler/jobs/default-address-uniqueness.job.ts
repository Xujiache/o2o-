/**
 * DefaultAddressUniquenessJob:
 *   - GROUP BY user_id HAVING SUM(is_default)>1
 *   - 多于 1 条默认地址时,保留 updated_at 最大的那条,其余 is_default=0
 * 周期:每天 03:30。
 */
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CustomerAddress } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

@Injectable()
export class DefaultAddressUniquenessJob extends BaseJob {
  readonly name = 'default-address-uniqueness';
  protected override lockTtlMs = 5 * 60_000;

  constructor(
    @InjectRepository(CustomerAddress) private readonly repo: Repository<CustomerAddress>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('30 3 * * *', { name: 'default-address-uniqueness' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const offenders = await this.repo
      .createQueryBuilder('a')
      .select('a.user_id', 'userId')
      .where('a.is_default = 1')
      .groupBy('a.user_id')
      .having('COUNT(*) > 1')
      .getRawMany<{ userId: string }>();

    if (offenders.length === 0) {
      this.logger.debug('no users with duplicate default addresses');
      return;
    }

    let totalFixed = 0;
    for (const { userId } of offenders) {
      const rows = await this.repo.find({
        where: { userId, isDefault: 1 },
        order: { updatedAt: 'DESC' },
      });
      if (rows.length <= 1) continue;
      const keep = rows[0]!;
      const losers = rows.slice(1).map((r) => r.addressId);
      const now = String(Date.now());
      const r = await this.repo
        .createQueryBuilder()
        .update(CustomerAddress)
        .set({ isDefault: 0, updatedAt: now })
        .whereInIds(losers)
        .execute();
      totalFixed += r.affected ?? 0;
      this.logger.warn(
        `[address-default] user ${userId} had ${rows.length} default addresses; kept ${keep.addressId}, cleared ${losers.length}`,
      );
    }
    this.logger.log(`fixed ${totalFixed} duplicate default addresses across ${offenders.length} users`);
  }
}
