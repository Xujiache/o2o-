/**
 * 轨迹上传 service:本地缓存队列 + 网络重试 + 上报间隔配置。
 * 阶段 0 仅骨架,实际批量打包/压缩/防丢点策略 留给 Stage 3 / 8。
 *
 * 设计要点(Stage 3/8 实现时遵循):
 *   - 离线时点位写本地 storage 队列,网络恢复后批量补传
 *   - 后端接口预留 POST /api/v1/r/trace/upload(批量,数组上限 200 点)
 *   - 失败重试三次,失败后落 idempotency 防止双写
 */
import type { LocationPoint } from './location';

export interface TraceUploadConfig {
  /** 上报间隔(秒),默认 30s */
  intervalSeconds: number;
  /** 单批最大点数,默认 50 */
  batchSize: number;
  /** 队列容量(超出丢弃最旧),默认 1000 */
  bufferLimit: number;
}

export interface TraceUploadStats {
  queued: number;
  uploaded: number;
  failed: number;
  lastUploadAt: number | null;
}

export interface TraceUploadService {
  configure(config: Partial<TraceUploadConfig>): void;
  /** 入队一个点 */
  enqueue(point: LocationPoint): void;
  /** 启动周期性上传 */
  start(): Promise<void>;
  /** 停止周期性上传(不清队列) */
  stop(): void;
  /** 立即冲刷一次(返回上传成功的条数) */
  flush(): Promise<number>;
  /** 当前统计 */
  getStats(): TraceUploadStats;
}

class MockTraceUploadService implements TraceUploadService {
  private config: TraceUploadConfig = {
    intervalSeconds: 30,
    batchSize: 50,
    bufferLimit: 1000,
  };
  private queue: LocationPoint[] = [];
  private stats: TraceUploadStats = { queued: 0, uploaded: 0, failed: 0, lastUploadAt: null };
  private timer: ReturnType<typeof setInterval> | null = null;

  configure(config: Partial<TraceUploadConfig>): void {
    this.config = { ...this.config, ...config };
  }

  enqueue(point: LocationPoint): void {
    if (this.queue.length >= this.config.bufferLimit) {
      this.queue.shift();
    }
    this.queue.push(point);
    this.stats.queued = this.queue.length;
  }

  async start(): Promise<void> {
    if (this.timer) return;
    // TODO: Stage 3/8 接入 — 网络状态监听(uni.onNetworkStatusChange)+ 退避策略
    this.timer = setInterval(() => {
      void this.flush();
    }, this.config.intervalSeconds * 1000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async flush(): Promise<number> {
    if (this.queue.length === 0) return 0;
    const batch = this.queue.splice(0, this.config.batchSize);
    // TODO: Stage 3/8 接入 — 调 POST /api/v1/r/trace/upload + 失败回滚队列
    this.stats.uploaded += batch.length;
    this.stats.queued = this.queue.length;
    this.stats.lastUploadAt = Date.now();
    return batch.length;
  }

  getStats(): TraceUploadStats {
    return { ...this.stats };
  }
}

export const traceUploadService: TraceUploadService = new MockTraceUploadService();
