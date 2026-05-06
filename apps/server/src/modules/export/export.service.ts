import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ExportTask } from '../../database/entities';

import type { CreateExportDto, ExportTaskVo } from './export.dto';

@Injectable()
export class ExportService {
  constructor(@InjectRepository(ExportTask) private readonly repo: Repository<ExportTask>) {}

  async enqueue(dto: CreateExportDto, operatorAdminId: string): Promise<ExportTaskVo> {
    const now = Date.now();
    const exportNo = this.genNo(now);
    const row = this.repo.create({
      exportNo,
      exportType: dto.exportType,
      queryParams: dto.queryParams ?? null,
      operatorAdminId,
      status: 'PENDING',
      fileUrl: null,
      errorMessage: null,
      rowCount: null,
      createdAt: String(now),
      updatedAt: String(now),
    });
    const saved = await this.repo.save(row);
    return this.toVo(saved);
  }

  async detail(exportTaskId: string): Promise<ExportTaskVo> {
    const r = await this.repo.findOne({ where: { exportTaskId } });
    if (!r) throw new NotFoundException('export task not found');
    return this.toVo(r);
  }

  private toVo(r: ExportTask): ExportTaskVo {
    return {
      exportTaskId: r.exportTaskId,
      exportNo: r.exportNo,
      exportType: r.exportType,
      status: r.status,
      fileUrl: r.fileUrl,
      errorMessage: r.errorMessage,
      rowCount: r.rowCount,
      createdAt: Number(r.createdAt),
      updatedAt: Number(r.updatedAt),
    };
  }

  private genNo(now: number): string {
    const d = new Date(now);
    const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `EX${yyyymmdd}${String(now).slice(-6)}`;
  }
}
