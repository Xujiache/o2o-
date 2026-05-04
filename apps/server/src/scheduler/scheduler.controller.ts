/**
 * 定时任务手动触发接口(仅 dev 环境)。
 * 生产环境通过 NODE_ENV 守卫拒绝调用 — 见每个 endpoint 内的判断。
 */
import { BadRequestException, Controller, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { AdminJwtGuard } from '../modules/auth/guards/scope-jwt.guard';

import { AuditLogArchiveJob } from './jobs/audit-log-archive.job';
import type { BaseJob } from './jobs/base-job';
import { ConfigCacheRefreshJob } from './jobs/config-cache-refresh.job';
import { ExpiredCleanupJob } from './jobs/expired-cleanup.job';
import { ThirdPartyRetryJob } from './jobs/third-party-retry.job';

@ApiTags('admin-scheduler-dev')
@ApiSecurity('Admin-Token')
@Controller('admin/scheduler')
@UseGuards(AdminJwtGuard)
export class SchedulerController {
  private readonly jobsByName: Record<string, BaseJob>;

  constructor(
    private readonly expiredCleanup: ExpiredCleanupJob,
    private readonly auditLogArchive: AuditLogArchiveJob,
    private readonly thirdPartyRetry: ThirdPartyRetryJob,
    private readonly configCacheRefresh: ConfigCacheRefreshJob,
  ) {
    this.jobsByName = {
      [expiredCleanup.name]: expiredCleanup,
      [auditLogArchive.name]: auditLogArchive,
      [thirdPartyRetry.name]: thirdPartyRetry,
      [configCacheRefresh.name]: configCacheRefresh,
    };
  }

  @Post('trigger/:job')
  @ApiOperation({ summary: '手动触发定时任务(仅 dev 环境)' })
  async trigger(@Param('job') jobName: string): Promise<{
    job: string;
    executed: boolean;
    durationMs: number;
    error?: string;
    metrics: ReturnType<BaseJob['getMetrics']>;
  }> {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('manual trigger disabled in production');
    }
    const job = this.jobsByName[jobName];
    if (!job) {
      throw new NotFoundException(`unknown job: ${jobName}; available=[${Object.keys(this.jobsByName).join(',')}]`);
    }
    const result = await job.run();
    return { job: jobName, ...result, metrics: job.getMetrics() };
  }
}
