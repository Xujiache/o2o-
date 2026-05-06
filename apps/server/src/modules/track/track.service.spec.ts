import type { TrackPoint } from '../../database/entities';

import { TrackService } from './track.service';

interface World {
  points: TrackPoint[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const repo: any = {
    insert: jest.fn(async (rows: any[]) => {
      for (const r of rows) {
        w.points.push({ ...r, trackPointId: String(w.points.length + 1) } as TrackPoint);
      }
    }),
    find: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      let matched = w.points.filter((p) => {
        if (where.riderTaskId && p.riderTaskId !== where.riderTaskId) return false;
        if (where.riderId && p.riderId !== where.riderId) return false;
        if (where.recordedAt?._type === 'between') {
          const v = Number(p.recordedAt);
          if (v < Number(where.recordedAt._value[0]) || v > Number(where.recordedAt._value[1])) return false;
        } else if (where.recordedAt?._type === 'moreThanOrEqual') {
          const v = Number(p.recordedAt);
          if (v < Number(where.recordedAt._value)) return false;
        }
        return true;
      });
      if (opt.order?.recordedAt === 'ASC')
        matched = [...matched].sort((a, b) => Number(a.recordedAt) - Number(b.recordedAt));
      if (opt.take) matched = matched.slice(0, opt.take);
      return matched;
    }),
  };
  return { svc: new TrackService(repo) };
  /* eslint-enable */
}

describe('TrackService', () => {
  it('recordBatch 批量入库', async () => {
    const w: World = { points: [] };
    const { svc } = buildService(w);
    const n = await svc.recordBatch([
      { riderTaskId: '1', riderId: '30001', lng: 116.4, lat: 39.9, recordedAt: 1 },
      { riderTaskId: '1', riderId: '30001', lng: 116.5, lat: 39.95, recordedAt: 2 },
    ]);
    expect(n).toBe(2);
    expect(w.points.length).toBe(2);
  });

  it('recordBatch 空数组返回 0', async () => {
    const w: World = { points: [] };
    const { svc } = buildService(w);
    expect(await svc.recordBatch([])).toBe(0);
  });

  it('queryByTaskId ASC 排序', async () => {
    const w: World = {
      points: [
        { riderTaskId: '1', riderId: '30001', recordedAt: '300' } as TrackPoint,
        { riderTaskId: '1', riderId: '30001', recordedAt: '100' } as TrackPoint,
        { riderTaskId: '1', riderId: '30001', recordedAt: '200' } as TrackPoint,
      ],
    };
    const { svc } = buildService(w);
    const r = await svc.queryByTaskId('1');
    expect(r.map((p) => p.recordedAt)).toEqual(['100', '200', '300']);
  });

  it('queryByRiderId 按 since 过滤', async () => {
    const w: World = {
      points: [
        { riderTaskId: '1', riderId: '30001', recordedAt: '500' } as TrackPoint,
        { riderTaskId: '2', riderId: '30001', recordedAt: '600' } as TrackPoint,
      ],
    };
    const { svc } = buildService(w);
    const r = await svc.queryByRiderId('30001', 550);
    expect(r.length).toBe(1);
    expect(r[0]!.recordedAt).toBe('600');
  });
});
