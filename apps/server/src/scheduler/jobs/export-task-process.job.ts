import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ExportTask } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const SCAN_LIMIT = 20;

/**
 * Stage 9 — 导出任务异步处理。每 30s 扫 PENDING export_task → 标 PROCESSING →
 * mock 上传 minio → SUCCESS。真实 minio 上传 stage 11 接。
 */
@Injectable()
export class ExportTaskProcessJob extends BaseJob {
  readonly name = 'export-task-process';
  protected override lockTtlMs = 60_000;

  constructor(
    @InjectRepository(ExportTask) private readonly repo: Repository<ExportTask>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('*/30 * * * * *', { name: 'export-task-process' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const pending = await this.repo.find({ where: { status: 'PENDING' }, take: SCAN_LIMIT });
    for (const t of pending) {
      t.status = 'PROCESSING';
      t.updatedAt = String(Date.now());
      await this.repo.save(t);
      try {
        // mock 文件生成 + minio 上传
        const fileUrl = `http://minio.local/exports/${t.exportNo}.csv`;
        t.status = 'SUCCESS';
        t.fileUrl = fileUrl;
        t.rowCount = 0;
      } catch (err) {
        t.status = 'FAILED';
        t.errorMessage = err instanceof Error ? err.message : 'export failed';
      }
      t.updatedAt = String(Date.now());
      await this.repo.save(t);
    }
  }
}
