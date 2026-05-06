import type { ExportTask } from '../../database/entities';

import { ExportService } from './export.service';

interface World {
  rows: ExportTask[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const repo: any = {
    create: jest.fn((p: any) => ({ ...p }) as ExportTask),
    save: jest.fn(async (r: ExportTask) => {
      const item = { ...r, exportTaskId: String(w.rows.length + 1) } as ExportTask;
      w.rows.push(item);
      return item;
    }),
    findOne: jest.fn(async (opt: any) => {
      return w.rows.find((r) => r.exportTaskId === opt.where.exportTaskId) ?? null;
    }),
  };
  return { svc: new ExportService(repo) };
  /* eslint-enable */
}

describe('ExportService', () => {
  it('enqueue: 写 export_task PENDING + EX 编号', async () => {
    const w: World = { rows: [] };
    const { svc } = buildService(w);
    const r = await svc.enqueue({ exportType: 'food-orders', queryParams: { status: 'PAID' } }, '1');
    expect(r.status).toBe('PENDING');
    expect(r.exportNo).toMatch(/^EX\d{14}$/);
    expect(r.exportType).toBe('food-orders');
  });

  it('detail: 找到 + 找不到 throw', async () => {
    const w: World = {
      rows: [
        {
          exportTaskId: '1',
          exportNo: 'EX1',
          exportType: 'food-orders',
          queryParams: null,
          operatorAdminId: '1',
          status: 'SUCCESS',
          fileUrl: 'http://x',
          errorMessage: null,
          rowCount: 100,
          createdAt: '1',
          updatedAt: '1',
        } as unknown as ExportTask,
      ],
    };
    const { svc } = buildService(w);
    const v = await svc.detail('1');
    expect(v.fileUrl).toBe('http://x');
    await expect(svc.detail('999')).rejects.toThrow();
  });

  it('enqueue: queryParams 默认 null', async () => {
    const w: World = { rows: [] };
    const { svc } = buildService(w);
    await svc.enqueue({ exportType: 'errand-orders' }, '1');
    expect(w.rows[0]?.queryParams).toBeNull();
  });
});
