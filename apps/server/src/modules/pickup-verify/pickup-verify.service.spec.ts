import { createHash } from 'node:crypto';

import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { GroceryOrder, GroceryOrderItem, PickupPoint, PickupVerifyLog } from '../../database/entities';

import { PickupVerifyService } from './pickup-verify.service';

// ============ FakeRedis ============
class FakeRedis {
  store = new Map<string, string>();
  counters = new Map<string, number>();
  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  async set(key: string, val: string, ..._args: unknown[]): Promise<'OK' | null> {
    // 支持 NX: 若 args 含 'NX' 且 key 存在 → 返回 null
    if (_args.includes('NX') && this.store.has(key)) return null;
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
  orders: GroceryOrder[];
  items: GroceryOrderItem[];
  points: PickupPoint[];
  logs: PickupVerifyLog[];
  redis: FakeRedis;
  nextLogId: number;
}

function hashCode(code: string): string {
  const salt = process.env.PICKUP_CODE_SALT ?? 'o2o-grocery-default-salt';
  return createHash('sha256').update(`${code}${salt}`).digest('hex');
}

function buildService(w: World): PickupVerifyService {
  const orderRepo = {
    findOne: jest.fn(
      async ({ where }: { where: Partial<GroceryOrder> }) =>
        w.orders.find(
          (o) =>
            (where.pickupCodeHash ? o.pickupCodeHash === where.pickupCodeHash : true) &&
            (where.groceryOrderId ? o.groceryOrderId === where.groceryOrderId : true),
        ) ?? null,
    ),
    update: jest.fn(async (criteria: Partial<GroceryOrder>, patch: Partial<GroceryOrder>) => {
      const idx = w.orders.findIndex((o) => o.groceryOrderId === criteria.groceryOrderId);
      if (idx >= 0) w.orders[idx] = { ...w.orders[idx]!, ...patch };
      return { affected: 1, raw: [] };
    }),
  } as unknown as Repository<GroceryOrder>;

  const itemRepo = {
    find: jest.fn(async ({ where }: { where: { groceryOrderId: string } }) =>
      w.items.filter((it) => it.groceryOrderId === where.groceryOrderId),
    ),
  } as unknown as Repository<GroceryOrderItem>;

  const pointRepo = {
    findOne: jest.fn(
      async ({ where }: { where: Partial<PickupPoint> }) =>
        w.points.find((p) => p.pickupPointId === where.pickupPointId) ?? null,
    ),
  } as unknown as Repository<PickupPoint>;

  const logRepo = {
    insert: jest.fn(async (rec: Partial<PickupVerifyLog>) => {
      const id = String(w.nextLogId++);
      w.logs.push({ ...(rec as PickupVerifyLog), verifyLogId: id });
      return { identifiers: [{ verifyLogId: id }], generatedMaps: [], raw: [] };
    }),
    createQueryBuilder: jest.fn(() => {
      const filters: { op?: string; pp?: string; r?: number; f?: number; t?: number } = {};
      let _skip = 0;
      let _take = 20;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qb: any = {};
      qb.where = jest.fn().mockImplementation((_sql: string, params: { op: string }) => {
        filters.op = params.op;
        return qb;
      });
      qb.andWhere = jest
        .fn()
        .mockImplementation((sql: string, params?: { pp?: string; r?: number; f?: number; t?: number }) => {
          if (params?.pp !== undefined) filters.pp = params.pp;
          if (params?.r !== undefined) filters.r = Number(params.r);
          if (params?.f !== undefined) filters.f = Number(params.f);
          if (params?.t !== undefined) filters.t = Number(params.t);
          return qb;
        });
      qb.orderBy = jest.fn().mockReturnValue(qb);
      qb.skip = jest.fn().mockImplementation((n: number) => {
        _skip = n;
        return qb;
      });
      qb.take = jest.fn().mockImplementation((n: number) => {
        _take = n;
        return qb;
      });
      const filtered = (): PickupVerifyLog[] => {
        let arr = w.logs.filter((l) => l.operatorId === filters.op);
        if (filters.pp !== undefined) arr = arr.filter((l) => l.pickupPointId === filters.pp);
        if (filters.r !== undefined) arr = arr.filter((l) => l.result === filters.r);
        if (filters.f !== undefined && filters.t !== undefined)
          arr = arr.filter((l) => {
            const t = Number(l.createdAt);
            return t >= filters.f! && t <= filters.t!;
          });
        return arr.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      };
      qb.getManyAndCount = jest.fn().mockImplementation(async () => {
        const all = filtered();
        return [all.slice(_skip, _skip + _take), all.length];
      });
      return qb;
    }),
  } as unknown as Repository<PickupVerifyLog>;

  return new PickupVerifyService(orderRepo, itemRepo, logRepo, pointRepo, w.redis as unknown as never);
}

function makeWorld(): World {
  const code = '123456';
  const hash = hashCode(code);
  return {
    orders: [
      {
        groceryOrderId: 'GO1',
        orderNo: 'G20260501000001',
        pickupPointId: 'PT1',
        pickupDate: '2026-05-15',
        pickupStartMinute: 600,
        pickupEndMinute: 660,
        status: 'PAID_WAIT_PICKUP',
        pickupCode: code,
        pickupCodeHash: hash,
        estimatedPayableAmount: '1000',
        finalPayableAmount: null,
      } as unknown as GroceryOrder,
    ],
    items: [
      {
        groceryOrderItemId: 'IT1',
        groceryOrderId: 'GO1',
        productId: 'P1',
        productName: '猪肉',
        pricingMode: 'weighed',
        weightUnit: 'jin',
        unitPrice: '4000',
        estimatedQuantity: 1000,
        actualQuantity: null,
        estimatedSubtotal: '8000',
        actualSubtotal: null,
      } as unknown as GroceryOrderItem,
    ],
    points: [{ pickupPointId: 'PT1', merchantId: 'M1' } as unknown as PickupPoint],
    logs: [],
    redis: new FakeRedis(),
    nextLogId: 1,
  };
}

// =================== Tests ===================

describe('PickupVerifyService.verify - 6 位码', () => {
  let svc: PickupVerifyService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    svc = buildService(w);
  });

  it('成功 → 状态变 SETTLING + 写流水 result=1', async () => {
    const r = await svc.verify('M1', 'Alice', { pickupCode: '123456' }, '127.0.0.1');
    expect(r.groceryOrderId).toBe('GO1');
    expect(r.status).toBe('SETTLING');
    expect(w.orders[0]!.status).toBe('SETTLING');
    expect(w.logs).toHaveLength(1);
    expect(w.logs[0]!.result).toBe(1);
    expect(w.logs[0]!.verifyMethod).toBe(2); // 手输
    expect(r.needsWeighing).toBe(true);
  });

  it('qrPayload PICKUP:orderNo:code 解析正确', async () => {
    const r = await svc.verify('M1', 'Alice', { qrPayload: 'PICKUP:G20260501000001:123456' }, null);
    expect(r.status).toBe('SETTLING');
    expect(w.logs[0]!.verifyMethod).toBe(1);
  });

  it('qrPayload 格式错 → INVALID_PARAM', async () => {
    await expect(svc.verify('M1', 'Alice', { qrPayload: 'BAD' }, null)).rejects.toThrow(UnprocessableEntityException);
    // 失败应记 fail log
    expect(w.logs.find((l) => l.result === 0)).toBeTruthy();
  });

  it('码格式错(非6位) → INVALID_PARAM', async () => {
    await expect(svc.verify('M1', 'Alice', { pickupCode: '12' }, null)).rejects.toThrow(UnprocessableEntityException);
  });

  it('hash 找不到 → 404 PICKUP_CODE_INVALID', async () => {
    await expect(svc.verify('M1', 'Alice', { pickupCode: '999999' }, null)).rejects.toThrow(NotFoundException);
    expect(w.logs.find((l) => l.failReason === 'CODE_NOT_FOUND')).toBeTruthy();
  });

  it('店员非该 point 商家 → 403 POINT_FORBIDDEN', async () => {
    await expect(svc.verify('OTHER_M', 'Bob', { pickupCode: '123456' }, null)).rejects.toThrow(ForbiddenException);
    expect(w.logs.find((l) => l.failReason === 'POINT_FORBIDDEN')).toBeTruthy();
  });

  it('状态非 PAID_WAIT_PICKUP/SETTLING/DIFF_PAYING → BAD_STATUS', async () => {
    w.orders[0]!.status = 'COMPLETED';
    await expect(svc.verify('M1', 'Alice', { pickupCode: '123456' }, null)).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(w.logs.some((l) => l.failReason?.startsWith('BAD_STATUS'))).toBe(true);
  });

  it('SETTLING 状态可重新核销(不改状态)', async () => {
    w.orders[0]!.status = 'SETTLING';
    const r = await svc.verify('M1', 'Alice', { pickupCode: '123456' }, null);
    expect(r.status).toBe('SETTLING');
    // 不应更新订单(只在 PAID_WAIT_PICKUP 才更新)
    expect(w.logs[0]!.result).toBe(1);
  });
});

describe('PickupVerifyService.verify - 限频', () => {
  let svc: PickupVerifyService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    svc = buildService(w);
  });

  it('同一 operator 5 次失败后封禁', async () => {
    // 累计 5 次失败(模拟错码触发 fail counter)
    for (let i = 0; i < 5; i++) {
      await expect(svc.verify('M1', 'Alice', { pickupCode: '999999' }, null)).rejects.toThrow();
    }
    // 第 6 次:即便码正确,因为 failCount>=5 也被封禁
    await expect(svc.verify('M1', 'Alice', { pickupCode: '123456' }, null)).rejects.toThrow(ForbiddenException);
  });

  it('成功核销后清空失败计数', async () => {
    // 先失败 2 次
    await expect(svc.verify('M1', 'Alice', { pickupCode: '999999' }, null)).rejects.toThrow();
    await expect(svc.verify('M1', 'Alice', { pickupCode: '999999' }, null)).rejects.toThrow();
    expect(w.redis.store.get('verify:rl:op:M1')).toBe('2');
    // 成功一次
    await svc.verify('M1', 'Alice', { pickupCode: '123456' }, null);
    // 应清零
    expect(w.redis.store.has('verify:rl:op:M1')).toBe(false);
  });
});

describe('PickupVerifyService.logs', () => {
  let svc: PickupVerifyService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    svc = buildService(w);
    const t0 = new Date('2026-05-10T10:00:00.000').getTime();
    for (let i = 0; i < 25; i++) {
      w.logs.push({
        verifyLogId: String(i + 1),
        groceryOrderId: 'GO1',
        orderNo: 'G',
        pickupPointId: 'PT1',
        operatorId: 'M1',
        operatorName: null,
        verifyMethod: 2,
        result: i % 2,
        failReason: null,
        clientIp: null,
        createdAt: String(t0 + i * 60_000),
      } as unknown as PickupVerifyLog);
    }
    w.nextLogId = 100;
  });

  it('分页:pageNo=1,pageSize=10', async () => {
    const r = await svc.logs('M1', { pageNo: 1, pageSize: 10 });
    expect(r.total).toBe(25);
    expect(r.items).toHaveLength(10);
  });

  it('result 筛选(1=成功)', async () => {
    const r = await svc.logs('M1', { result: '1' });
    expect(r.total).toBe(w.logs.filter((l) => l.result === 1).length);
    expect(r.items.every((it) => it.result === 1)).toBe(true);
  });

  it('日期范围筛选', async () => {
    const r = await svc.logs('M1', { fromDate: '2026-05-10', toDate: '2026-05-10' });
    expect(r.total).toBe(25);
  });

  it('日期范围外 → 0', async () => {
    const r = await svc.logs('M1', { fromDate: '2026-04-01', toDate: '2026-04-02' });
    expect(r.total).toBe(0);
  });

  it('排序 DESC by createdAt', async () => {
    const r = await svc.logs('M1', { pageSize: 5 });
    // 时间应递减
    for (let i = 1; i < r.items.length; i++) {
      expect(r.items[i - 1]!.createdAt).toBeGreaterThanOrEqual(r.items[i]!.createdAt);
    }
  });
});
