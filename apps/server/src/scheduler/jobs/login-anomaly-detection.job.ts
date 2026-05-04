/**
 * LoginAnomalyDetectionJob:
 *   - 扫 login_device 最近 1 小时,如果同 user_id 出现 2 个及以上不同 login_city → 记录告警日志
 *   - 本阶段仅落日志;stage 11 起触发风控事件 / 给用户发短信
 * 周期:每 10 分钟。
 */
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';

import { LoginDevice } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const WINDOW_MS = 60 * 60 * 1000;

@Injectable()
export class LoginAnomalyDetectionJob extends BaseJob {
  readonly name = 'login-anomaly-detection';
  protected override lockTtlMs = 5 * 60_000;

  constructor(
    @InjectRepository(LoginDevice) private readonly repo: Repository<LoginDevice>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'login-anomaly-detection' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const since = Date.now() - WINDOW_MS;
    const recent = await this.repo.find({
      where: { loginAt: MoreThan(String(since)) },
      order: { loginAt: 'DESC' },
      take: 1000,
    });
    const cityByUser = new Map<string, Set<string>>();
    for (const d of recent) {
      if (!d.loginCity) continue;
      const set = cityByUser.get(d.userId) ?? new Set<string>();
      set.add(d.loginCity);
      cityByUser.set(d.userId, set);
    }
    let anomalies = 0;
    for (const [userId, cities] of cityByUser) {
      if (cities.size > 1) {
        anomalies++;
        this.logger.warn(
          `[anomaly] user ${userId} logged in from ${cities.size} cities in last 1h: ${[...cities].join(', ')}`,
        );
      }
    }
    this.logger.log(`scanned ${recent.length} login_device rows, detected ${anomalies} cross-city anomalies`);
  }
}
