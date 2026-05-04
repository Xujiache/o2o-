/**
 * ConfigChanged 订阅器 — 触发 ConfigCacheRefreshJob.refreshOne 即时刷新单 key 缓存。
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { ConfigCacheRefreshJob } from '../../scheduler/jobs/config-cache-refresh.job';
import { type ConfigChangedPayload, EventName } from '../events';

@Injectable()
export class ConfigChangedSubscriber {
  private readonly logger = new Logger(ConfigChangedSubscriber.name);

  constructor(private readonly cacheRefresh: ConfigCacheRefreshJob) {}

  @OnEvent(EventName.ConfigChanged)
  async handle(payload: ConfigChangedPayload): Promise<void> {
    await this.cacheRefresh.refreshOne(payload.configKey);
    this.logger.log(`refreshed config cache: ${payload.configKey}`);
  }
}
