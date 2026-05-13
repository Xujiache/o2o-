import { createHmac } from 'node:crypto';

import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import type Redis from 'ioredis';
import { Repository } from 'typeorm';

import { REDIS_CLIENT } from '../../config/redis.module';
import { Product, TraceBatch, TraceQr, TraceRecord, TraceScanLog } from '../../database/entities';

import type {
  BatchListPageVo,
  CreateTraceBatchDto,
  CreateTraceRecordDto,
  CustomerTraceInfoVo,
  GenerateQrcodesVo,
  ListBatchesQueryDto,
  QrLookupVo,
  TraceBatchVo,
  TraceRecordVo,
  UpdateTraceRecordDto,
} from './trace.dto';

const QR_TASK_PREFIX = 'trace:qr:task:';
const QR_TASK_TTL = 7 * 24 * 3600;
const SCAN_RATELIMIT_PREFIX = 'trace:scan:rl:';
const SCAN_RATELIMIT_TTL = 60;
const SCAN_RATELIMIT_MAX = 30;

interface QrGenerationTask {
  taskId: string;
  traceBatchId: string;
  requested: number;
  progress: number;
  status: 'queued' | 'running' | 'done' | 'failed';
  errorMessage: string | null;
  createdAt: number;
}

function shortSig(secret: string, qrCode: string): string {
  return createHmac('sha256', secret).update(qrCode).digest('hex').slice(0, 16);
}

function fullSig(secret: string, qrCode: string): string {
  return createHmac('sha256', secret).update(qrCode).digest('hex');
}

@Injectable()
export class TraceService {
  private readonly logger = new Logger(TraceService.name);

  constructor(
    @InjectRepository(TraceBatch) private readonly batchRepo: Repository<TraceBatch>,
    @InjectRepository(TraceQr) private readonly qrRepo: Repository<TraceQr>,
    @InjectRepository(TraceRecord) private readonly recordRepo: Repository<TraceRecord>,
    @InjectRepository(TraceScanLog) private readonly scanLogRepo: Repository<TraceScanLog>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private get secret(): string {
    return process.env.TRACE_SECRET ?? 'o2o-trace-default-secret';
  }

  private batchToVo(b: TraceBatch, generatedCount?: number): TraceBatchVo {
    return {
      traceBatchId: b.traceBatchId,
      batchNo: b.batchNo,
      productId: b.productId,
      totalCount: b.totalCount,
      producedAt: Number(b.producedAt),
      shelfLifeDays: b.shelfLifeDays,
      supplierName: b.supplierName,
      status: b.status,
      createdAt: Number(b.createdAt),
      ...(generatedCount !== undefined ? { generatedCount } : {}),
    };
  }

  // ============= Batch =============

  async createBatch(creatorId: string, dto: CreateTraceBatchDto): Promise<TraceBatchVo> {
    const dup = await this.batchRepo.findOne({ where: { batchNo: dto.batchNo } });
    if (dup) {
      throw new UnprocessableEntityException({ code: ErrorCode.DUPLICATE_REQUEST, detail: 'BATCH_NO_DUP' });
    }
    const product = await this.productRepo.findOne({ where: { productId: dto.productId } });
    if (!product) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, detail: 'PRODUCT_NOT_FOUND' });
    const now = String(Date.now());
    const saved = await this.batchRepo.save(
      this.batchRepo.create({
        batchNo: dto.batchNo,
        productId: dto.productId,
        totalCount: dto.totalCount,
        producedAt: String(dto.producedAt),
        shelfLifeDays: dto.shelfLifeDays ?? null,
        supplierName: dto.supplierName ?? null,
        status: 1,
        createdBy: creatorId,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return this.batchToVo(saved, 0);
  }

  async listBatches(query: ListBatchesQueryDto): Promise<BatchListPageVo> {
    const pageNo = Math.max(1, Number(query.pageNo) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const where: Record<string, unknown> = {};
    if (query.productId) where.productId = query.productId;
    const [list, total] = await this.batchRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    // 简化:不联表查 generatedCount,前端如需细节可单查
    return { items: list.map((b) => this.batchToVo(b)), total, pageNo, pageSize };
  }

  async getBatchById(batchId: string): Promise<TraceBatchVo> {
    const b = await this.batchRepo.findOne({ where: { traceBatchId: batchId } });
    if (!b) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
    const generatedCount = await this.qrRepo.count({ where: { traceBatchId: batchId } });
    return this.batchToVo(b, generatedCount);
  }

  // ============= QR Generation =============

  /**
   * 异步生成二维码记录。
   * 仅写入 DB 记录(qr_code + signature + 序号);PNG 图片在 download 时按需生成,避免阻塞。
   */
  async generateQrcodes(traceBatchId: string, count: number): Promise<GenerateQrcodesVo> {
    const batch = await this.batchRepo.findOne({ where: { traceBatchId } });
    if (!batch) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
    const existing = await this.qrRepo.count({ where: { traceBatchId } });
    const remain = Math.max(0, batch.totalCount - existing);
    if (remain <= 0) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'BATCH_FULL',
        message: '该批次已生成完毕',
      });
    }
    const toGen = Math.min(count, remain);
    const taskId = `${traceBatchId}-${Date.now()}`;
    const task: QrGenerationTask = {
      taskId,
      traceBatchId,
      requested: toGen,
      progress: 0,
      status: 'queued',
      errorMessage: null,
      createdAt: Date.now(),
    };
    await this.redis.set(`${QR_TASK_PREFIX}${taskId}`, JSON.stringify(task), 'EX', QR_TASK_TTL);
    // 异步执行(setImmediate);失败仅记录,不影响主请求返回
    setImmediate(() => {
      void this.runQrGeneration(task, batch, existing).catch((e: unknown) => {
        this.logger.error(`[trace.qr.gen] task=${task.taskId} failed: ${e instanceof Error ? e.message : String(e)}`);
      });
    });
    return { ...task, status: 'queued' };
  }

  private async runQrGeneration(task: QrGenerationTask, batch: TraceBatch, existing: number): Promise<void> {
    task.status = 'running';
    await this.redis.set(`${QR_TASK_PREFIX}${task.taskId}`, JSON.stringify(task), 'EX', QR_TASK_TTL);
    const now = String(Date.now());
    const chunkSize = 500;
    let inserted = 0;
    try {
      while (inserted < task.requested) {
        const thisChunk = Math.min(chunkSize, task.requested - inserted);
        const rows: Partial<TraceQr>[] = [];
        for (let i = 0; i < thisChunk; i++) {
          const serial = existing + inserted + i + 1;
          const qrCode = `T${batch.batchNo}${String(serial).padStart(5, '0')}`;
          rows.push({
            qrCode,
            signature: fullSig(this.secret, qrCode),
            traceBatchId: batch.traceBatchId,
            productId: batch.productId,
            serialNo: serial,
            status: 1,
            scanCount: 0,
            createdAt: now,
          });
        }
        await this.qrRepo.insert(rows);
        inserted += thisChunk;
        task.progress = inserted;
        await this.redis.set(`${QR_TASK_PREFIX}${task.taskId}`, JSON.stringify(task), 'EX', QR_TASK_TTL);
      }
      task.status = 'done';
      await this.redis.set(`${QR_TASK_PREFIX}${task.taskId}`, JSON.stringify(task), 'EX', QR_TASK_TTL);
    } catch (e: unknown) {
      task.status = 'failed';
      task.errorMessage = e instanceof Error ? e.message : String(e);
      await this.redis.set(`${QR_TASK_PREFIX}${task.taskId}`, JSON.stringify(task), 'EX', QR_TASK_TTL);
      throw e;
    }
  }

  async getQrTask(taskId: string): Promise<GenerateQrcodesVo> {
    const raw = await this.redis.get(`${QR_TASK_PREFIX}${taskId}`);
    if (!raw) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, detail: 'TASK_NOT_FOUND' });
    return JSON.parse(raw);
  }

  /**
   * 下载二维码 CSV 索引 + PNG 列表(URL 形式 — 实际打包成 ZIP 需要 archiver,
   * 留作环境安装后再启用 streaming endpoint;当前先返回 CSV 数据流)
   */
  async exportBatchCsv(traceBatchId: string, baseUrl: string): Promise<{ filename: string; csv: string }> {
    const batch = await this.batchRepo.findOne({ where: { traceBatchId } });
    if (!batch) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
    const qrs = await this.qrRepo.find({
      where: { traceBatchId },
      order: { serialNo: 'ASC' },
    });
    const header = 'serial_no,qr_code,signature_short,url\n';
    const lines = qrs.map((q) => {
      const sig = q.signature.slice(0, 16);
      const url = `${baseUrl}/c/trace/info?code=${q.qrCode}&sig=${sig}`;
      return `${q.serialNo},${q.qrCode},${sig},${url}`;
    });
    return {
      filename: `trace-${batch.batchNo}-qrcodes.csv`,
      csv: header + lines.join('\n') + '\n',
    };
  }

  async lookupQrByCode(code: string): Promise<QrLookupVo> {
    const qr = await this.qrRepo.findOne({ where: { qrCode: code } });
    if (!qr) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
    const batch = await this.batchRepo.findOne({ where: { traceBatchId: qr.traceBatchId } });
    const product = await this.productRepo.findOne({ where: { productId: qr.productId } });
    return {
      traceQrId: qr.traceQrId,
      qrCode: qr.qrCode,
      traceBatchId: qr.traceBatchId,
      batchNo: batch?.batchNo ?? '',
      productId: qr.productId,
      productName: product?.name ?? '',
      serialNo: qr.serialNo,
      status: qr.status,
      scanCount: qr.scanCount,
      firstScanAt: qr.firstScanAt ? Number(qr.firstScanAt) : null,
    };
  }

  async getQrById(qrId: string): Promise<QrLookupVo & { records: TraceRecordVo[] }> {
    const qr = await this.qrRepo.findOne({ where: { traceQrId: qrId } });
    if (!qr) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
    const lookup = await this.lookupQrByCode(qr.qrCode);
    // QR 维度节点 ∪ 该批次维度节点(traceQrId IS NULL);用 QueryBuilder 保证 NULL 匹配在 MySQL 下生效
    const records = await this.recordRepo
      .createQueryBuilder('r')
      .where('r.traceQrId = :qid', { qid: qrId })
      .orWhere('(r.traceBatchId = :bid AND r.traceQrId IS NULL)', { bid: qr.traceBatchId })
      .orderBy('r.happenedAt', 'DESC')
      .getMany();
    return { ...lookup, records: records.map((r) => this.recordToVo(r)) };
  }

  // ============= Record =============

  private recordToVo(r: TraceRecord): TraceRecordVo {
    return {
      traceRecordId: r.traceRecordId,
      traceQrId: r.traceQrId,
      traceBatchId: r.traceBatchId,
      nodeType: r.nodeType,
      nodeTitle: r.nodeTitle,
      content: r.content,
      attachments: r.attachments,
      happenedAt: Number(r.happenedAt),
      operatorName: r.operatorName,
      createdAt: Number(r.createdAt),
    };
  }

  async createRecord(
    operatorId: string,
    operatorName: string | null,
    dto: CreateTraceRecordDto,
  ): Promise<TraceRecordVo> {
    const batch = await this.batchRepo.findOne({ where: { traceBatchId: dto.traceBatchId } });
    if (!batch) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, detail: 'BATCH_NOT_FOUND' });
    if (dto.traceQrId) {
      const qr = await this.qrRepo.findOne({ where: { traceQrId: dto.traceQrId } });
      if (!qr || qr.traceBatchId !== dto.traceBatchId) {
        throw new UnprocessableEntityException({ code: ErrorCode.STATUS_INVALID, detail: 'QR_BATCH_MISMATCH' });
      }
    }
    const now = String(Date.now());
    const saved = await this.recordRepo.save(
      this.recordRepo.create({
        traceQrId: dto.traceQrId ?? null,
        traceBatchId: dto.traceBatchId,
        nodeType: dto.nodeType,
        nodeTitle: dto.nodeTitle,
        content: dto.content ?? null,
        attachments: dto.attachments ?? null,
        happenedAt: String(dto.happenedAt),
        operatorId,
        operatorName,
        createdAt: now,
      }),
    );
    return this.recordToVo(saved);
  }

  async updateRecord(operatorId: string, recordId: string, dto: UpdateTraceRecordDto): Promise<TraceRecordVo> {
    const r = await this.recordRepo.findOne({ where: { traceRecordId: recordId } });
    if (!r) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
    const patch: Partial<TraceRecord> = {};
    if (dto.nodeTitle !== undefined) patch.nodeTitle = dto.nodeTitle;
    if (dto.content !== undefined) patch.content = dto.content;
    if (dto.attachments !== undefined) patch.attachments = dto.attachments;
    if (dto.happenedAt !== undefined) patch.happenedAt = String(dto.happenedAt);
    await this.recordRepo.update({ traceRecordId: recordId }, patch);
    const refreshed = await this.recordRepo.findOne({ where: { traceRecordId: recordId } });
    return this.recordToVo(refreshed!);
  }

  async deleteRecord(recordId: string): Promise<void> {
    await this.recordRepo.delete({ traceRecordId: recordId });
  }

  // ============= Customer Scan =============

  async customerScan(
    qrCode: string,
    sig: string,
    customerId: string | null,
    clientIp: string | null,
    ua: string | null,
  ): Promise<CustomerTraceInfoVo> {
    // 1) 验签
    const expectShort = shortSig(this.secret, qrCode);
    if (sig !== expectShort) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, detail: 'QR_INVALID' });
    }
    // 2) 限频:同 IP 30/min
    if (clientIp) {
      const rlKey = `${SCAN_RATELIMIT_PREFIX}${clientIp}`;
      const cnt = await this.redis.incr(rlKey).catch(() => 0);
      if (cnt === 1) await this.redis.expire(rlKey, SCAN_RATELIMIT_TTL).catch(() => undefined);
      if (cnt > SCAN_RATELIMIT_MAX) {
        throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, detail: 'RATE_LIMITED' });
      }
    }
    const qr = await this.qrRepo.findOne({ where: { qrCode } });
    if (!qr || qr.status === 0) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, detail: 'QR_NOT_FOUND' });
    }
    const batch = await this.batchRepo.findOne({ where: { traceBatchId: qr.traceBatchId } });
    const product = await this.productRepo.findOne({ where: { productId: qr.productId } });
    if (!batch || !product) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, detail: 'BATCH_OR_PRODUCT_MISSING' });
    }
    // 3) 节点 = qr 维度 ∪ 批次维度
    const recordsQr = await this.recordRepo.find({ where: { traceQrId: qr.traceQrId } });
    const recordsBatch = await this.recordRepo
      .createQueryBuilder('r')
      .where('r.traceBatchId = :bid', { bid: qr.traceBatchId })
      .andWhere('r.traceQrId IS NULL')
      .getMany();
    const records = [...recordsQr, ...recordsBatch].sort((a, b) => Number(b.happenedAt) - Number(a.happenedAt));

    // 4) 更新扫码计数 + 写日志
    const now = String(Date.now());
    await this.qrRepo.update(
      { traceQrId: qr.traceQrId },
      { scanCount: qr.scanCount + 1, firstScanAt: qr.firstScanAt ?? now, status: 2 },
    );
    setImmediate(() => {
      void this.scanLogRepo
        .insert({
          traceQrId: qr.traceQrId,
          qrCode,
          customerId,
          clientIp,
          ua,
          scannedAt: now,
        })
        .catch(() => undefined);
    });

    return {
      product: {
        productId: product.productId,
        name: product.name,
        coverImageFileId: product.coverImageFileId,
        productType: product.productType,
      },
      batch: {
        traceBatchId: batch.traceBatchId,
        batchNo: batch.batchNo,
        producedAt: Number(batch.producedAt),
        shelfLifeDays: batch.shelfLifeDays,
        supplierName: batch.supplierName,
      },
      qr: {
        traceQrId: qr.traceQrId,
        qrCode: qr.qrCode,
        scanCount: qr.scanCount + 1,
        firstScanAt: qr.firstScanAt ? Number(qr.firstScanAt) : Number(now),
      },
      records: records.map((r) => this.recordToVo(r)),
    };
  }

  async statsForBatch(batchId: string): Promise<{ batchNo: string; totalScans: number; uniqueQrScanned: number }> {
    const batch = await this.batchRepo.findOne({ where: { traceBatchId: batchId } });
    if (!batch) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
    const qrs = await this.qrRepo.find({ where: { traceBatchId: batchId } });
    const ids = qrs.map((q) => q.traceQrId);
    const totalScans = qrs.reduce((s, q) => s + q.scanCount, 0);
    const uniqueQrScanned = ids.length
      ? await this.scanLogRepo
          .createQueryBuilder('l')
          .where('l.traceQrId IN (:...ids)', { ids })
          .select('COUNT(DISTINCT l.traceQrId)', 'cnt')
          .getRawOne<{ cnt: string }>()
          .then((r) => Number(r?.cnt ?? 0))
      : 0;
    return { batchNo: batch.batchNo, totalScans, uniqueQrScanned };
  }
}
