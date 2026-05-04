/**
 * 定时任务基类:
 *   - 分布式锁(避免多实例重复执行)
 *   - 失败重试 try-catch + 错误日志
 *   - metrics(执行次数 / 成功次数 / 失败次数 / 总耗时 ms)
 *   - 子类只实现 do() 业务逻辑
 */
import { Logger } from '@nestjs/common';

import type { DistributedLockService } from '../distributed-lock.service';

export interface JobMetrics {
  runs: number;
  success: number;
  failed: number;
  totalDurationMs: number;
  lastRunAt: number | null;
  lastError: string | null;
}

export abstract class BaseJob {
  abstract readonly name: string;
  /** 锁 TTL(ms) — 默认与单次执行最大允许时长一致 */
  protected lockTtlMs = 60_000;

  protected readonly logger = new Logger(this.constructor.name);
  protected readonly metrics: JobMetrics = {
    runs: 0,
    success: 0,
    failed: 0,
    totalDurationMs: 0,
    lastRunAt: null,
    lastError: null,
  };

  protected abstract readonly lock: DistributedLockService;

  abstract do(): Promise<void>;

  /**
   * 由 @Cron 调用 / 由 dev controller 手动触发。
   * 包了一层分布式锁 + 计时 + 错误日志。
   */
  async run(): Promise<{ executed: boolean; durationMs: number; error?: string }> {
    const lockKey = `job:${this.name}`;
    const token = await this.lock.acquire(lockKey, this.lockTtlMs);
    if (!token) {
      this.logger.debug(`[${this.name}] skipped — lock held by another instance`);
      return { executed: false, durationMs: 0 };
    }

    const start = Date.now();
    this.metrics.runs += 1;
    this.metrics.lastRunAt = start;
    try {
      await this.do();
      const dur = Date.now() - start;
      this.metrics.success += 1;
      this.metrics.totalDurationMs += dur;
      this.logger.log(`[${this.name}] ok in ${dur}ms`);
      return { executed: true, durationMs: dur };
    } catch (e: unknown) {
      const dur = Date.now() - start;
      this.metrics.failed += 1;
      this.metrics.totalDurationMs += dur;
      const msg = e instanceof Error ? e.message : String(e);
      this.metrics.lastError = msg;
      this.logger.error(`[${this.name}] failed in ${dur}ms: ${msg}`);
      return { executed: true, durationMs: dur, error: msg };
    } finally {
      await this.lock.release(lockKey, token);
    }
  }

  getMetrics(): JobMetrics {
    return { ...this.metrics };
  }
}
