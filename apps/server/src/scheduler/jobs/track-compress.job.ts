import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { TrackPoint } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const COMPRESS_OLDER_THAN_MS = 60 * 60 * 1000;
const SAMPLE_INTERVAL_MS = 30 * 1000;
const SCAN_LIMIT = 5000;

/**
 * Stage 8 — 轨迹压缩。每 5min 扫描 1h 前的 track_point,按 30s 间隔抽样保留。
 * 简化算法:同 rider_task_id 内,按 recordedAt 排序,每 30s 保留一个,其余删除。
 * P3 登记 stage 11 接 Douglas-Peucker 真压缩。
 */
@Injectable()
export class TrackCompressJob extends BaseJob {
  readonly name = 'track-compress';
  protected override lockTtlMs = 5 * 60_000;

  constructor(
    @InjectRepository(TrackPoint) private readonly trackRepo: Repository<TrackPoint>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 */5 * * * *', { name: 'track-compress' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const cutoff = Date.now() - COMPRESS_OLDER_THAN_MS;
    const oldPoints = await this.trackRepo.find({
      where: { recordedAt: LessThan(String(cutoff)) },
      order: { riderTaskId: 'ASC', recordedAt: 'ASC' },
      take: SCAN_LIMIT,
    });
    if (!oldPoints.length) return;

    const grouped = new Map<string, TrackPoint[]>();
    for (const p of oldPoints) {
      const arr = grouped.get(p.riderTaskId) ?? [];
      arr.push(p);
      grouped.set(p.riderTaskId, arr);
    }

    let removed = 0;
    for (const [, arr] of grouped) {
      arr.sort((a, b) => Number(a.recordedAt) - Number(b.recordedAt));
      let lastKept = -Infinity;
      const toRemove: string[] = [];
      for (const p of arr) {
        const t = Number(p.recordedAt);
        if (t - lastKept >= SAMPLE_INTERVAL_MS) {
          lastKept = t;
        } else {
          toRemove.push(p.trackPointId);
        }
      }
      if (toRemove.length) {
        await this.trackRepo.delete(toRemove);
        removed += toRemove.length;
      }
    }
    if (removed > 0) {
      this.logger.log(`[track-compress] removed ${removed} points across ${grouped.size} tasks`);
    }
  }
}
