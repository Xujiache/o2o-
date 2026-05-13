import { createHmac } from 'node:crypto';

import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { Product, TraceBatch, TraceQr, TraceRecord, TraceScanLog } from '../../database/entities';

import { TraceService } from './trace.service';

class FakeRedis {
  store = new Map<string, string>();
  counters = new Map<string, number>();
  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  async set(key: string, val: string, ..._args: unknown[]): Promise<'OK'> {
    this.store.set(key, val);
    return 'OK';
  }
  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }
  async incr(key: string): Promise<number> {
    const v = (this.counters.get(key) ?? Number(this.store.get(key) ?? 0)) + 1;
    this.counters.set(key, v);
    this.store.set(key, String(v));
    return v;
  }
  async expire(_key: string, _ttl: number): Promise<number> {
    return 1;
  }
}

interface World {
  batches: TraceBatch[];
  qrs: TraceQr[];
  records: TraceRecord[];
  scanLogs: TraceScanLog[];
  products: Product[];
  redis: FakeRedis;
  nextBatchId: number;
  nextQrId: number;
  nextRecordId: number;
  nextScanLogId: number;
}

function makeWorld(): World {
  return {
    batches: [],
    qrs: [],
    records: [],
    scanLogs: [],
    products: [
      {
        productId: 'P1',
        name: '苹果',
        coverImageFileId: null,
        productType: 'grocery',
      } as unknown as Product,
    ],
    redis: new FakeRedis(),
    nextBatchId: 1,
    nextQrId: 1,
    nextRecordId: 1,
    nextScanLogId: 1,
  };
}

function buildService(w: World): TraceService {
  const batchRepo = {
    findOne: jest.fn(
      async ({ where }: { where: Partial<TraceBatch> }) =>
        w.batches.find(
          (b) =>
            (where.traceBatchId ? b.traceBatchId === where.traceBatchId : true) &&
            (where.batchNo ? b.batchNo === where.batchNo : true),
        ) ?? null,
    ),
    findAndCount: jest.fn(
      async ({ where, skip = 0, take = 20 }: { where: { productId?: string }; skip?: number; take?: number }) => {
        let arr = w.batches.slice();
        if (where.productId) arr = arr.filter((b) => b.productId === where.productId);
        arr.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
        return [arr.slice(skip, skip + take), arr.length] as [TraceBatch[], number];
      },
    ),
    create: jest.fn((data: Partial<TraceBatch>) => ({ ...data }) as TraceBatch),
    save: jest.fn(async (data: Partial<TraceBatch>) => {
      const id = String(w.nextBatchId++);
      const rec = { ...(data as TraceBatch), traceBatchId: id };
      w.batches.push(rec);
      return rec;
    }),
  } as unknown as Repository<TraceBatch>;

  const qrRepo = {
    findOne: jest.fn(
      async ({ where }: { where: Partial<TraceQr> }) =>
        w.qrs.find(
          (q) =>
            (where.traceQrId ? q.traceQrId === where.traceQrId : true) &&
            (where.qrCode ? q.qrCode === where.qrCode : true),
        ) ?? null,
    ),
    count: jest.fn(
      async ({ where }: { where: { traceBatchId: string } }) =>
        w.qrs.filter((q) => q.traceBatchId === where.traceBatchId).length,
    ),
    find: jest.fn(async ({ where }: { where: { traceBatchId: string } }) =>
      w.qrs.filter((q) => q.traceBatchId === where.traceBatchId).sort((a, b) => a.serialNo - b.serialNo),
    ),
    insert: jest.fn(async (rows: Partial<TraceQr>[]) => {
      for (const r of rows) {
        const id = String(w.nextQrId++);
        w.qrs.push({ ...(r as TraceQr), traceQrId: id });
      }
      return { identifiers: [], generatedMaps: [], raw: [] };
    }),
    update: jest.fn(async (criteria: Partial<TraceQr>, patch: Partial<TraceQr>) => {
      const idx = w.qrs.findIndex((q) => q.traceQrId === criteria.traceQrId);
      if (idx >= 0) w.qrs[idx] = { ...w.qrs[idx]!, ...patch };
      return { affected: 1, raw: [] };
    }),
  } as unknown as Repository<TraceQr>;

  const recordRepo = {
    findOne: jest.fn(
      async ({ where }: { where: Partial<TraceRecord> }) =>
        w.records.find((r) => r.traceRecordId === where.traceRecordId) ?? null,
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    find: jest.fn(async ({ where }: any) => {
      // 支持 where: {traceQrId} 或 数组
      if (Array.isArray(where)) {
        const out: TraceRecord[] = [];
        for (const w2 of where) {
          for (const r of w.records) {
            const matches =
              (w2.traceQrId === undefined || r.traceQrId === w2.traceQrId) &&
              (w2.traceBatchId === undefined || r.traceBatchId === w2.traceBatchId);
            if (matches && !out.includes(r)) out.push(r);
          }
        }
        return out;
      }
      let arr = w.records.slice();
      if (where.traceQrId !== undefined) arr = arr.filter((r) => r.traceQrId === where.traceQrId);
      if (where.traceBatchId !== undefined) arr = arr.filter((r) => r.traceBatchId === where.traceBatchId);
      return arr;
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createQueryBuilder: jest.fn(() => {
      const filters: { bid?: string; qrNull?: boolean } = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qb: any = {};
      qb.where = jest.fn().mockImplementation((_sql: string, params: { bid: string }) => {
        filters.bid = params.bid;
        return qb;
      });
      qb.andWhere = jest.fn().mockImplementation((sql: string) => {
        if (sql.includes('traceQrId IS NULL')) filters.qrNull = true;
        return qb;
      });
      qb.getMany = jest
        .fn()
        .mockImplementation(async () =>
          w.records.filter(
            (r) =>
              (filters.bid ? r.traceBatchId === filters.bid : true) && (filters.qrNull ? r.traceQrId === null : true),
          ),
        );
      return qb;
    }),
    create: jest.fn((data: Partial<TraceRecord>) => ({ ...data }) as TraceRecord),
    save: jest.fn(async (data: Partial<TraceRecord>) => {
      const id = String(w.nextRecordId++);
      const rec = { ...(data as TraceRecord), traceRecordId: id };
      w.records.push(rec);
      return rec;
    }),
    update: jest.fn(async (criteria: Partial<TraceRecord>, patch: Partial<TraceRecord>) => {
      const idx = w.records.findIndex((r) => r.traceRecordId === criteria.traceRecordId);
      if (idx >= 0) w.records[idx] = { ...w.records[idx]!, ...patch };
      return { affected: 1, raw: [] };
    }),
    delete: jest.fn(async (criteria: Partial<TraceRecord>) => {
      const idx = w.records.findIndex((r) => r.traceRecordId === criteria.traceRecordId);
      if (idx >= 0) w.records.splice(idx, 1);
      return { affected: 1, raw: [] };
    }),
  } as unknown as Repository<TraceRecord>;

  const scanLogRepo = {
    insert: jest.fn(async (rec: Partial<TraceScanLog>) => {
      const id = String(w.nextScanLogId++);
      w.scanLogs.push({ ...(rec as TraceScanLog), traceScanLogId: id });
      return { identifiers: [{ traceScanLogId: id }], generatedMaps: [], raw: [] };
    }),
    createQueryBuilder: jest.fn(() => {
      const filters: { ids?: string[] } = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qb: any = {};
      qb.where = jest.fn().mockImplementation((_sql: string, params: { ids: string[] }) => {
        filters.ids = params.ids;
        return qb;
      });
      qb.select = jest.fn().mockReturnValue(qb);
      qb.getRawOne = jest.fn().mockImplementation(async () => {
        const distinct = new Set<string>();
        for (const l of w.scanLogs) {
          if (filters.ids?.includes(l.traceQrId)) distinct.add(l.traceQrId);
        }
        return { cnt: String(distinct.size) };
      });
      return qb;
    }),
  } as unknown as Repository<TraceScanLog>;

  const productRepo = {
    findOne: jest.fn(
      async ({ where }: { where: Partial<Product> }) => w.products.find((p) => p.productId === where.productId) ?? null,
    ),
  } as unknown as Repository<Product>;

  return new TraceService(batchRepo, qrRepo, recordRepo, scanLogRepo, productRepo, w.redis as unknown as never);
}

function shortSig(qrCode: string): string {
  const secret = process.env.TRACE_SECRET ?? 'o2o-trace-default-secret';
  return createHmac('sha256', secret).update(qrCode).digest('hex').slice(0, 16);
}

// =============== Tests ===============

describe('TraceService.createBatch', () => {
  let svc: TraceService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    svc = buildService(w);
  });

  it('成功创建批次', async () => {
    const r = await svc.createBatch('admin1', {
      productId: 'P1',
      batchNo: 'B001',
      totalCount: 100,
      producedAt: 1700000000000,
    });
    expect(r.batchNo).toBe('B001');
    expect(r.totalCount).toBe(100);
    expect(w.batches).toHaveLength(1);
  });

  it('重复 batchNo → DUPLICATE_REQUEST', async () => {
    w.batches.push({
      traceBatchId: '1',
      batchNo: 'B001',
      productId: 'P1',
      totalCount: 100,
      producedAt: '0',
      shelfLifeDays: null,
      supplierName: null,
      status: 1,
      createdBy: 'a',
      createdAt: '0',
      updatedAt: '0',
    } as unknown as TraceBatch);
    await expect(
      svc.createBatch('admin1', { productId: 'P1', batchNo: 'B001', totalCount: 50, producedAt: 0 }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('产品不存在 → NotFound', async () => {
    await expect(
      svc.createBatch('admin1', { productId: 'NONE', batchNo: 'B002', totalCount: 10, producedAt: 0 }),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('TraceService.generateQrcodes', () => {
  let svc: TraceService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    svc = buildService(w);
    w.batches.push({
      traceBatchId: 'B1',
      batchNo: 'BN001',
      productId: 'P1',
      totalCount: 100,
      producedAt: '0',
      shelfLifeDays: null,
      supplierName: null,
      status: 1,
      createdBy: 'a',
      createdAt: '0',
      updatedAt: '0',
    } as unknown as TraceBatch);
  });

  it('queue 任务 + Redis 写 task 状态 + 异步完成 done', async () => {
    const r = await svc.generateQrcodes('B1', 10);
    expect(r.status).toBe('queued');
    expect(r.requested).toBe(10);
    // 异步执行 setImmediate
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));
    // 读 redis 状态应为 done
    const raw = await w.redis.get(`trace:qr:task:${r.taskId}`);
    expect(raw).not.toBeNull();
    const task = JSON.parse(raw!);
    expect(task.status).toBe('done');
    expect(task.progress).toBe(10);
    expect(w.qrs).toHaveLength(10);
    // qrCode 命名格式 T{batchNo}{serial}
    expect(w.qrs[0]!.qrCode).toBe('TBN00100001');
  });

  it('批次不存在 → NotFound', async () => {
    await expect(svc.generateQrcodes('NONE', 5)).rejects.toThrow(NotFoundException);
  });

  it('批次已满 → BATCH_FULL', async () => {
    // 把 qrs 塞满
    for (let i = 0; i < 100; i++) {
      w.qrs.push({
        traceQrId: String(i + 1),
        qrCode: `TBN001${String(i + 1).padStart(5, '0')}`,
        signature: 'x',
        traceBatchId: 'B1',
        productId: 'P1',
        serialNo: i + 1,
        qrImageFileId: null,
        status: 1,
        firstScanAt: null,
        scanCount: 0,
        createdAt: '0',
      } as unknown as TraceQr);
    }
    await expect(svc.generateQrcodes('B1', 5)).rejects.toThrow(UnprocessableEntityException);
  });
});

describe('TraceService.exportBatchCsv', () => {
  let svc: TraceService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    svc = buildService(w);
    w.batches.push({
      traceBatchId: 'B1',
      batchNo: 'BN001',
      productId: 'P1',
      totalCount: 3,
      producedAt: '0',
      shelfLifeDays: null,
      supplierName: null,
      status: 1,
      createdBy: 'a',
      createdAt: '0',
      updatedAt: '0',
    } as unknown as TraceBatch);
    for (let i = 1; i <= 3; i++) {
      w.qrs.push({
        traceQrId: String(i),
        qrCode: `TBN00100${i}0${i}`,
        signature: 'a'.repeat(64),
        traceBatchId: 'B1',
        productId: 'P1',
        serialNo: i,
        qrImageFileId: null,
        status: 1,
        firstScanAt: null,
        scanCount: 0,
        createdAt: '0',
      } as unknown as TraceQr);
    }
  });

  it('CSV header + N 行', async () => {
    const r = await svc.exportBatchCsv('B1', 'https://x.com');
    expect(r.filename).toBe('trace-BN001-qrcodes.csv');
    const lines = r.csv.trim().split('\n');
    expect(lines[0]).toBe('serial_no,qr_code,signature_short,url');
    expect(lines).toHaveLength(4); // 1 header + 3 data
    expect(lines[1]).toContain('TBN0010010');
    expect(lines[1]).toContain('https://x.com/c/trace/info?code=');
  });

  it('批次不存在 → NotFound', async () => {
    await expect(svc.exportBatchCsv('NONE', 'https://x.com')).rejects.toThrow(NotFoundException);
  });
});

describe('TraceService.customerScan', () => {
  let svc: TraceService;
  let w: World;
  const qrCode = 'TBN00100001';
  beforeEach(() => {
    w = makeWorld();
    svc = buildService(w);
    w.batches.push({
      traceBatchId: 'B1',
      batchNo: 'BN001',
      productId: 'P1',
      totalCount: 10,
      producedAt: '1700000000000',
      shelfLifeDays: 365,
      supplierName: 'S Inc.',
      status: 1,
      createdBy: 'a',
      createdAt: '0',
      updatedAt: '0',
    } as unknown as TraceBatch);
    w.qrs.push({
      traceQrId: 'Q1',
      qrCode,
      signature: 'x',
      traceBatchId: 'B1',
      productId: 'P1',
      serialNo: 1,
      qrImageFileId: null,
      status: 1,
      firstScanAt: null,
      scanCount: 0,
      createdAt: '0',
    } as unknown as TraceQr);
    w.records.push({
      traceRecordId: 'R1',
      traceQrId: null,
      traceBatchId: 'B1',
      nodeType: 1,
      nodeTitle: '产地',
      content: '云南',
      attachments: null,
      happenedAt: '1700000001000',
      operatorId: null,
      operatorName: 'op',
      createdAt: '0',
    } as unknown as TraceRecord);
    w.records.push({
      traceRecordId: 'R2',
      traceQrId: 'Q1',
      traceBatchId: 'B1',
      nodeType: 6,
      nodeTitle: '上架',
      content: null,
      attachments: null,
      happenedAt: '1700000002000',
      operatorId: null,
      operatorName: 'op',
      createdAt: '0',
    } as unknown as TraceRecord);
  });

  it('HMAC 验签通过 → 返回 product+batch+records + scanCount+1', async () => {
    const sig = shortSig(qrCode);
    const r = await svc.customerScan(qrCode, sig, 'C1', '1.2.3.4', 'UA');
    expect(r.product.productId).toBe('P1');
    expect(r.batch.batchNo).toBe('BN001');
    expect(r.qr.scanCount).toBe(1);
    expect(r.records).toHaveLength(2);
    // 写扫码日志 setImmediate
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(w.scanLogs.length).toBe(1);
    // qr 表 scanCount 已 +1
    expect(w.qrs[0]!.scanCount).toBe(1);
  });

  it('验签失败 → 404', async () => {
    await expect(svc.customerScan(qrCode, 'badsig', null, null, null)).rejects.toThrow(NotFoundException);
  });

  it('QR 不存在 → 404', async () => {
    const otherCode = 'TBN00100999';
    const sig = shortSig(otherCode);
    await expect(svc.customerScan(otherCode, sig, null, null, null)).rejects.toThrow(NotFoundException);
  });

  it('同 IP 30/min 限流 → 第 31 次拒绝', async () => {
    const sig = shortSig(qrCode);
    for (let i = 0; i < 30; i++) {
      await svc.customerScan(qrCode, sig, null, '9.9.9.9', null);
    }
    await expect(svc.customerScan(qrCode, sig, null, '9.9.9.9', null)).rejects.toThrow(ForbiddenException);
  });

  it('records 节点合并 qr 维度 + batch 维度 且按 happenedAt DESC', async () => {
    const sig = shortSig(qrCode);
    const r = await svc.customerScan(qrCode, sig, null, null, null);
    // R2 (qr 维度, happenedAt 1700000002000) 应在 R1 (batch 维度, happenedAt 1700000001000) 之前
    expect(r.records[0]!.traceRecordId).toBe('R2');
    expect(r.records[1]!.traceRecordId).toBe('R1');
  });
});

describe('TraceService.createRecord', () => {
  let svc: TraceService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    svc = buildService(w);
    w.batches.push({
      traceBatchId: 'B1',
      batchNo: 'BN001',
      productId: 'P1',
      totalCount: 5,
      producedAt: '0',
      shelfLifeDays: null,
      supplierName: null,
      status: 1,
      createdBy: 'a',
      createdAt: '0',
      updatedAt: '0',
    } as unknown as TraceBatch);
    w.batches.push({
      traceBatchId: 'B2',
      batchNo: 'BN002',
      productId: 'P1',
      totalCount: 5,
      producedAt: '0',
      shelfLifeDays: null,
      supplierName: null,
      status: 1,
      createdBy: 'a',
      createdAt: '0',
      updatedAt: '0',
    } as unknown as TraceBatch);
    w.qrs.push({
      traceQrId: 'Q1',
      qrCode: 'TBN00100001',
      signature: 'x',
      traceBatchId: 'B1',
      productId: 'P1',
      serialNo: 1,
      qrImageFileId: null,
      status: 1,
      firstScanAt: null,
      scanCount: 0,
      createdAt: '0',
    } as unknown as TraceQr);
  });

  it('批次维度成功(无 traceQrId)', async () => {
    const r = await svc.createRecord('op1', '张三', {
      traceBatchId: 'B1',
      nodeType: 1,
      nodeTitle: '产地',
      happenedAt: 1700000000000,
    });
    expect(r.traceQrId).toBeNull();
    expect(r.traceBatchId).toBe('B1');
    expect(r.nodeTitle).toBe('产地');
    expect(w.records).toHaveLength(1);
  });

  it('QR 维度成功(qr 属于 batch)', async () => {
    const r = await svc.createRecord('op1', '张三', {
      traceBatchId: 'B1',
      traceQrId: 'Q1',
      nodeType: 6,
      nodeTitle: '上架',
      happenedAt: 1700000000000,
    });
    expect(r.traceQrId).toBe('Q1');
  });

  it('QR 与 batch 不匹配 → QR_BATCH_MISMATCH', async () => {
    await expect(
      svc.createRecord('op1', '张三', {
        traceBatchId: 'B2',
        traceQrId: 'Q1', // Q1 实际属于 B1
        nodeType: 1,
        nodeTitle: 'x',
        happenedAt: 0,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('批次不存在 → NotFound', async () => {
    await expect(
      svc.createRecord('op1', '张三', {
        traceBatchId: 'NONE',
        nodeType: 1,
        nodeTitle: 'x',
        happenedAt: 0,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('TraceService.statsForBatch', () => {
  let svc: TraceService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    svc = buildService(w);
    w.batches.push({
      traceBatchId: 'B1',
      batchNo: 'BN001',
      productId: 'P1',
      totalCount: 5,
      producedAt: '0',
      shelfLifeDays: null,
      supplierName: null,
      status: 1,
      createdBy: 'a',
      createdAt: '0',
      updatedAt: '0',
    } as unknown as TraceBatch);
    w.qrs.push(
      {
        traceQrId: 'Q1',
        qrCode: 'A1',
        traceBatchId: 'B1',
        productId: 'P1',
        serialNo: 1,
        scanCount: 3,
        status: 1,
      } as unknown as TraceQr,
      {
        traceQrId: 'Q2',
        qrCode: 'A2',
        traceBatchId: 'B1',
        productId: 'P1',
        serialNo: 2,
        scanCount: 5,
        status: 1,
      } as unknown as TraceQr,
      {
        traceQrId: 'Q3',
        qrCode: 'A3',
        traceBatchId: 'B1',
        productId: 'P1',
        serialNo: 3,
        scanCount: 0,
        status: 1,
      } as unknown as TraceQr,
    );
    // 扫码日志:Q1 被扫 2 次,Q2 被扫 1 次,Q3 没有
    w.scanLogs.push(
      {
        traceScanLogId: '1',
        traceQrId: 'Q1',
        qrCode: 'A1',
        customerId: null,
        clientIp: null,
        ua: null,
        scannedAt: '0',
      } as unknown as TraceScanLog,
      {
        traceScanLogId: '2',
        traceQrId: 'Q1',
        qrCode: 'A1',
        customerId: null,
        clientIp: null,
        ua: null,
        scannedAt: '0',
      } as unknown as TraceScanLog,
      {
        traceScanLogId: '3',
        traceQrId: 'Q2',
        qrCode: 'A2',
        customerId: null,
        clientIp: null,
        ua: null,
        scannedAt: '0',
      } as unknown as TraceScanLog,
    );
  });

  it('totalScans = 各 QR scanCount 之和 + unique = 扫码日志 DISTINCT', async () => {
    const r = await svc.statsForBatch('B1');
    expect(r.batchNo).toBe('BN001');
    expect(r.totalScans).toBe(3 + 5 + 0);
    expect(r.uniqueQrScanned).toBe(2); // Q1+Q2
  });

  it('批次不存在 → NotFound', async () => {
    await expect(svc.statsForBatch('NONE')).rejects.toThrow(NotFoundException);
  });
});
