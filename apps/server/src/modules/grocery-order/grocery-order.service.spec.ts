import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type {
  GroceryOrder,
  GroceryOrderItem,
  PickupPoint,
  PickupTimeSlot,
  Product,
  Store,
} from '../../database/entities';

import { GroceryOrderService } from './grocery-order.service';

// =============== Fake Redis (Map-based) ===============

class FakeRedis {
  store = new Map<string, string>();
  counter = new Map<string, number>();

  async set(key: string, val: string, ..._args: unknown[]): Promise<'OK'> {
    this.store.set(key, val);
    return 'OK';
  }
  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }
  async incr(key: string): Promise<number> {
    const v = (this.counter.get(key) ?? 0) + 1;
    this.counter.set(key, v);
    return v;
  }
  async expire(_key: string, _ttl: number): Promise<number> {
    return 1;
  }
}

// =============== World ===============

interface World {
  products: Product[];
  stores: Store[];
  points: PickupPoint[];
  slots: PickupTimeSlot[];
  orders: GroceryOrder[];
  items: GroceryOrderItem[];
  redis: FakeRedis;
  nextOrderId: number;
}

function makeWorld(): World {
  const w: World = {
    products: [
      {
        productId: 'P1',
        storeId: 'S1',
        productType: 'grocery',
        pricingMode: 'fixed',
        saleStatus: 'on_shelf',
        price: '300',
        stock: 100,
        name: '苹果',
        coverImageFileId: null,
        weightUnit: null,
        minWeightG: null,
        maxWeightG: null,
        unitPricePerJin: null,
      } as unknown as Product,
      {
        productId: 'P2',
        storeId: 'S1',
        productType: 'grocery',
        pricingMode: 'weighed',
        saleStatus: 'on_shelf',
        price: '0',
        stock: 5000,
        name: '猪肉',
        coverImageFileId: null,
        weightUnit: 'jin',
        minWeightG: 200,
        maxWeightG: 5000,
        unitPricePerJin: '4000', // 40 元/斤 = 4000 分/斤
      } as unknown as Product,
      {
        productId: 'P3',
        storeId: 'S2', // 不同商家
        productType: 'grocery',
        pricingMode: 'fixed',
        saleStatus: 'on_shelf',
        price: '100',
        stock: 10,
        name: '别家商品',
        coverImageFileId: null,
        weightUnit: null,
      } as unknown as Product,
      {
        productId: 'P4',
        storeId: 'S1',
        productType: 'grocery',
        pricingMode: 'fixed',
        saleStatus: 'off_shelf', // 已下架
        price: '100',
        stock: 100,
        name: '下架了',
        coverImageFileId: null,
        weightUnit: null,
      } as unknown as Product,
      {
        productId: 'P5',
        storeId: 'S1',
        productType: 'grocery',
        pricingMode: 'fixed',
        saleStatus: 'on_shelf',
        price: '100',
        stock: 2, // 库存少
        name: '快没了',
        coverImageFileId: null,
        weightUnit: null,
      } as unknown as Product,
    ],
    stores: [
      { storeId: 'S1', merchantId: 'M1' } as unknown as Store,
      { storeId: 'S2', merchantId: 'M2' } as unknown as Store,
    ],
    points: [
      { pickupPointId: 'PT1', merchantId: 'M1', status: 1 } as unknown as PickupPoint,
      { pickupPointId: 'PT_OFF', merchantId: 'M1', status: 0 } as unknown as PickupPoint, // 已停用
    ],
    slots: [
      {
        slotId: 'SL1',
        pickupPointId: 'PT1',
        slotDate: futureDateStr(2),
        startMinute: 600,
        endMinute: 660,
        capacity: 10,
        reserved: 0,
        status: 1,
      } as unknown as PickupTimeSlot,
      {
        slotId: 'SL_FULL',
        pickupPointId: 'PT1',
        slotDate: futureDateStr(2),
        startMinute: 700,
        endMinute: 760,
        capacity: 2,
        reserved: 2,
        status: 1,
      } as unknown as PickupTimeSlot,
      {
        slotId: 'SL_SOON',
        pickupPointId: 'PT1',
        slotDate: todayDateStr(),
        startMinute: nowMinute() + 10, // 10 分钟内
        endMinute: nowMinute() + 70,
        capacity: 10,
        reserved: 0,
        status: 1,
      } as unknown as PickupTimeSlot,
      {
        slotId: 'SL_OFF',
        pickupPointId: 'PT1',
        slotDate: futureDateStr(2),
        startMinute: 800,
        endMinute: 860,
        capacity: 10,
        reserved: 0,
        status: 0,
      } as unknown as PickupTimeSlot,
    ],
    orders: [],
    items: [],
    redis: new FakeRedis(),
    nextOrderId: 9000001,
  };
  return w;
}

function futureDateStr(daysFromToday: number): string {
  const d = new Date(Date.now() + daysFromToday * 24 * 60 * 60 * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function todayDateStr(): string {
  return futureDateStr(0);
}
function nowMinute(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// =============== Service Factory ===============

function buildService(w: World): GroceryOrderService {
  const productRepo = {
    findOne: jest.fn(
      async ({ where }: { where: Partial<Product> }) => w.products.find((p) => p.productId === where.productId) ?? null,
    ),
    find: jest.fn(async ({ where }: { where: { productId?: { _value?: string[] } | string } }) => {
      const arg = where.productId;
      let ids: string[] = [];
      if (typeof arg === 'string') ids = [arg];
      else if (arg && Array.isArray((arg as { _value?: string[] })._value)) ids = (arg as { _value: string[] })._value;
      return w.products.filter((p) => ids.includes(p.productId));
    }),
  } as unknown as Repository<Product>;

  const itemRepo = {
    find: jest.fn(async ({ where }: { where: { groceryOrderId?: { _value?: string[] } | string } }) => {
      const arg = where.groceryOrderId;
      let ids: string[] = [];
      if (typeof arg === 'string') ids = [arg];
      else if (arg && Array.isArray((arg as { _value?: string[] })._value)) ids = (arg as { _value: string[] })._value;
      return w.items.filter((it) => ids.includes(it.groceryOrderId));
    }),
  } as unknown as Repository<GroceryOrderItem>;

  const pointRepo = {
    findOne: jest.fn(
      async ({ where }: { where: Partial<PickupPoint> }) =>
        w.points.find((p) => p.pickupPointId === where.pickupPointId) ?? null,
    ),
  } as unknown as Repository<PickupPoint>;

  const slotRepo = {
    findOne: jest.fn(
      async ({ where }: { where: Partial<PickupTimeSlot> }) => w.slots.find((s) => s.slotId === where.slotId) ?? null,
    ),
  } as unknown as Repository<PickupTimeSlot>;

  const storeRepo = {
    findOne: jest.fn(
      async ({ where }: { where: Partial<Store> }) => w.stores.find((s) => s.storeId === where.storeId) ?? null,
    ),
  } as unknown as Repository<Store>;

  // orderRepo:list / findAndCount / cancel-expired createQueryBuilder
  const orderRepo = {
    findOne: jest.fn(
      async ({ where }: { where: Partial<GroceryOrder> }) =>
        w.orders.find((o) => o.groceryOrderId === where.groceryOrderId) ?? null,
    ),
    findAndCount: jest.fn(
      async ({
        where,
        skip = 0,
        take = 20,
      }: {
        where: { customerId?: string; status?: string };
        skip?: number;
        take?: number;
        order?: unknown;
      }) => {
        let arr = w.orders.filter((o) => o.customerId === where.customerId);
        if (where.status) arr = arr.filter((o) => o.status === where.status);
        arr.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
        return [arr.slice(skip, skip + take), arr.length] as [GroceryOrder[], number];
      },
    ),
    createQueryBuilder: jest.fn(() => {
      // 用于 cancelExpired
      const filters: { now?: string } = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qb: any = {};
      qb.where = jest.fn().mockReturnValue(qb);
      qb.andWhere = jest.fn().mockImplementation((_sql: string, params?: { now?: string }) => {
        if (params?.now) filters.now = params.now;
        return qb;
      });
      qb.limit = jest.fn().mockReturnValue(qb);
      qb.getMany = jest.fn().mockImplementation(async () => {
        const now = Number(filters.now ?? Date.now());
        return w.orders.filter((o) => o.status === 'WAIT_PAY' && Number(o.expireAt) < now);
      });
      return qb;
    }),
  } as unknown as Repository<GroceryOrder>;

  // ===== em (tx) =====
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fakeEm: Partial<EntityManager> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getRepository: jest.fn().mockImplementation((entity: any) => {
      const name: string = entity?.name ?? '';
      if (name === 'PickupTimeSlot') {
        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          createQueryBuilder: jest.fn(() => {
            const filters: { id?: string } = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const qb: any = {};
            qb.where = jest.fn().mockImplementation((_sql: string, params: { id: string }) => {
              filters.id = params.id;
              return qb;
            });
            qb.setLock = jest.fn().mockReturnValue(qb);
            qb.getOne = jest.fn().mockImplementation(async () => w.slots.find((s) => s.slotId === filters.id) ?? null);
            return qb;
          }),
          increment: jest.fn(async (criteria: { slotId: string }, _field: string, by: number) => {
            const s = w.slots.find((x) => x.slotId === criteria.slotId);
            if (s) s.reserved += by;
            return { affected: 1, raw: [] };
          }),
          decrement: jest.fn(async (criteria: { slotId: string }, _field: string, by: number) => {
            const s = w.slots.find((x) => x.slotId === criteria.slotId);
            if (s) s.reserved = Math.max(0, s.reserved - by);
            return { affected: 1, raw: [] };
          }),
        };
      }
      if (name === 'Product') {
        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          createQueryBuilder: jest.fn(() => {
            const filters: { ids?: string[] } = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const qb: any = {};
            qb.where = jest.fn().mockImplementation((_sql: string, params: { ids: string[] }) => {
              filters.ids = params.ids;
              return qb;
            });
            qb.setLock = jest.fn().mockReturnValue(qb);
            qb.getMany = jest
              .fn()
              .mockImplementation(async () => w.products.filter((p) => filters.ids?.includes(p.productId)));
            return qb;
          }),
          decrement: jest.fn(async (criteria: { productId: string }, _field: string, by: number) => {
            const p = w.products.find((x) => x.productId === criteria.productId);
            if (p) p.stock = Math.max(0, p.stock - by);
            return { affected: 1, raw: [] };
          }),
          increment: jest.fn(async (criteria: { productId: string }, _field: string, by: number) => {
            const p = w.products.find((x) => x.productId === criteria.productId);
            if (p) p.stock += by;
            return { affected: 1, raw: [] };
          }),
        };
      }
      if (name === 'GroceryOrder') {
        return {
          findOne: jest.fn(
            async ({ where }: { where: Partial<GroceryOrder> }) =>
              w.orders.find((o) => o.groceryOrderId === where.groceryOrderId) ?? null,
          ),
          insert: jest.fn(async (rec: Partial<GroceryOrder>) => {
            const id = String(w.nextOrderId++);
            w.orders.push({ ...(rec as GroceryOrder), groceryOrderId: id });
            return { identifiers: [{ groceryOrderId: id }], generatedMaps: [], raw: [] };
          }),
          update: jest.fn(async (criteria: Partial<GroceryOrder>, patch: Partial<GroceryOrder>) => {
            const idx = w.orders.findIndex((o) => o.groceryOrderId === criteria.groceryOrderId);
            if (idx >= 0) w.orders[idx] = { ...w.orders[idx]!, ...patch };
            return { affected: 1, raw: [] };
          }),
        };
      }
      if (name === 'GroceryOrderItem') {
        return {
          insert: jest.fn(async (rec: Partial<GroceryOrderItem>) => {
            w.items.push(rec as GroceryOrderItem);
            return { identifiers: [], generatedMaps: [], raw: [] };
          }),
          find: jest.fn(async ({ where }: { where: { groceryOrderId: string } }) =>
            w.items.filter((it) => it.groceryOrderId === where.groceryOrderId),
          ),
        };
      }
      return {};
    }),
  };

  const dataSource = {
    transaction: jest.fn(async (cb: (em: EntityManager) => Promise<unknown>) => cb(fakeEm as EntityManager)),
  } as unknown as DataSource;

  return new GroceryOrderService(
    orderRepo,
    itemRepo,
    productRepo,
    pointRepo,
    slotRepo,
    storeRepo,
    w.redis as unknown as never,
    dataSource,
  );
}

// =================== Tests ===================

describe('GroceryOrderService.preview', () => {
  let svc: GroceryOrderService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    svc = buildService(w);
  });

  it('fixed 商品 → unitPrice*qty', async () => {
    const r = await svc.preview('C1', {
      pickupPointId: 'PT1',
      pickupSlotId: 'SL1',
      items: [{ productId: 'P1', quantity: 3 }],
    });
    expect(r.estimatedGoodsAmount).toBe('900'); // 300 * 3
    expect(r.estimatedPayableAmount).toBe('900');
    expect(r.hasWeighedItem).toBe(false);
  });

  it('weighed 商品 → unitPrice/斤 * 克 / 500', async () => {
    const r = await svc.preview('C1', {
      pickupPointId: 'PT1',
      pickupSlotId: 'SL1',
      items: [{ productId: 'P2', quantity: 1000 }], // 1000g
    });
    // 4000 分/斤 * 1000g / 500 = 8000 分
    expect(r.estimatedGoodsAmount).toBe('8000');
    expect(r.hasWeighedItem).toBe(true);
  });

  it('混合 fixed + weighed', async () => {
    const r = await svc.preview('C1', {
      pickupPointId: 'PT1',
      pickupSlotId: 'SL1',
      items: [
        { productId: 'P1', quantity: 2 },
        { productId: 'P2', quantity: 500 },
      ],
    });
    // 300*2 + 4000*500/500 = 600 + 4000 = 4600
    expect(r.estimatedGoodsAmount).toBe('4600');
    expect(r.hasWeighedItem).toBe(true);
  });

  it('preview 写入 redis(grocery:preview:*)', async () => {
    const r = await svc.preview('C1', {
      pickupPointId: 'PT1',
      pickupSlotId: 'SL1',
      items: [{ productId: 'P1', quantity: 1 }],
    });
    const keys = [...w.redis.store.keys()];
    expect(keys.some((k) => k === `grocery:preview:${r.previewId}`)).toBe(true);
  });

  it('自提点不存在 → NotFound', async () => {
    await expect(
      svc.preview('C1', {
        pickupPointId: 'NOPE',
        pickupSlotId: 'SL1',
        items: [{ productId: 'P1', quantity: 1 }],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('自提点 status=0 → NotFound', async () => {
    await expect(
      svc.preview('C1', {
        pickupPointId: 'PT_OFF',
        pickupSlotId: 'SL1',
        items: [{ productId: 'P1', quantity: 1 }],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('时段不属于该自提点 → SLOT_INVALID', async () => {
    await expect(
      svc.preview('C1', {
        pickupPointId: 'PT1',
        pickupSlotId: 'SL_NOT_EXIST',
        items: [{ productId: 'P1', quantity: 1 }],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('时段 status=0 → SLOT_INVALID', async () => {
    await expect(
      svc.preview('C1', {
        pickupPointId: 'PT1',
        pickupSlotId: 'SL_OFF',
        items: [{ productId: 'P1', quantity: 1 }],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('时段已满 → SLOT_FULL', async () => {
    await expect(
      svc.preview('C1', {
        pickupPointId: 'PT1',
        pickupSlotId: 'SL_FULL',
        items: [{ productId: 'P1', quantity: 1 }],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('时段 30 分钟内 → SLOT_TOO_SOON', async () => {
    await expect(
      svc.preview('C1', {
        pickupPointId: 'PT1',
        pickupSlotId: 'SL_SOON',
        items: [{ productId: 'P1', quantity: 1 }],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('产品已下架 → PRODUCT_OFF_SHELF', async () => {
    await expect(
      svc.preview('C1', {
        pickupPointId: 'PT1',
        pickupSlotId: 'SL1',
        items: [{ productId: 'P4', quantity: 1 }],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('库存不足 → STOCK_INSUFFICIENT', async () => {
    await expect(
      svc.preview('C1', {
        pickupPointId: 'PT1',
        pickupSlotId: 'SL1',
        items: [{ productId: 'P5', quantity: 10 }],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('跨商家 → CROSS_MERCHANT', async () => {
    await expect(
      svc.preview('C1', {
        pickupPointId: 'PT1',
        pickupSlotId: 'SL1',
        items: [
          { productId: 'P1', quantity: 1 },
          { productId: 'P3', quantity: 1 },
        ],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('weighed 小于 minWeightG → BELOW_MIN_WEIGHT', async () => {
    await expect(
      svc.preview('C1', {
        pickupPointId: 'PT1',
        pickupSlotId: 'SL1',
        items: [{ productId: 'P2', quantity: 100 }], // < 200
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('weighed 大于 maxWeightG → ABOVE_MAX_WEIGHT', async () => {
    await expect(
      svc.preview('C1', {
        pickupPointId: 'PT1',
        pickupSlotId: 'SL1',
        items: [{ productId: 'P2', quantity: 6000 }], // > 5000
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});

describe('GroceryOrderService.submit', () => {
  let svc: GroceryOrderService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    svc = buildService(w);
  });

  async function previewSnap(
    customerId: string,
    items: { productId: string; quantity: number }[] = [{ productId: 'P1', quantity: 2 }],
  ): Promise<string> {
    const r = await svc.preview(customerId, {
      pickupPointId: 'PT1',
      pickupSlotId: 'SL1',
      items,
    });
    return r.previewId;
  }

  it('成功 → 写订单 + 行项 + 锁库存 + reserved+1', async () => {
    const before = w.products.find((p) => p.productId === 'P1')!.stock;
    const beforeReserved = w.slots.find((s) => s.slotId === 'SL1')!.reserved;
    const pid = await previewSnap('C1');
    const r = await svc.submit('C1', { previewId: pid });
    expect(r.orderNo).toMatch(/^G\d{8}\d{6}$/);
    expect(w.orders[0]!.status).toBe('WAIT_PAY');
    expect(w.orders[0]!.payStatus).toBe('unpaid');
    expect(w.items).toHaveLength(1);
    expect(w.products.find((p) => p.productId === 'P1')!.stock).toBe(before - 2);
    expect(w.slots.find((s) => s.slotId === 'SL1')!.reserved).toBe(beforeReserved + 1);
    expect(r.expireAt).toBeGreaterThan(Date.now());
  });

  it('snapshot 不存在 → PREVIEW_EXPIRED', async () => {
    await expect(svc.submit('C1', { previewId: 'no-such' })).rejects.toThrow(UnprocessableEntityException);
  });

  it('customerId 不一致 → PREVIEW_OWNER_MISMATCH', async () => {
    const pid = await previewSnap('C1');
    await expect(svc.submit('C2', { previewId: pid })).rejects.toThrow(UnprocessableEntityException);
  });

  it('时段满了 → SLOT_FULL', async () => {
    const pid = await previewSnap('C1');
    // submit 前把时段塞满
    w.slots.find((s) => s.slotId === 'SL1')!.reserved = 10;
    await expect(svc.submit('C1', { previewId: pid })).rejects.toThrow(UnprocessableEntityException);
  });

  it('库存被抢光 → STOCK_INSUFFICIENT_AT_SUBMIT', async () => {
    const pid = await previewSnap('C1', [{ productId: 'P5', quantity: 2 }]);
    // submit 前把库存吃光
    w.products.find((p) => p.productId === 'P5')!.stock = 0;
    await expect(svc.submit('C1', { previewId: pid })).rejects.toThrow(UnprocessableEntityException);
  });

  it('submit 成功后 redis preview key 被删', async () => {
    const pid = await previewSnap('C1');
    expect(w.redis.store.has(`grocery:preview:${pid}`)).toBe(true);
    await svc.submit('C1', { previewId: pid });
    expect(w.redis.store.has(`grocery:preview:${pid}`)).toBe(false);
  });
});

describe('GroceryOrderService.cancel', () => {
  let svc: GroceryOrderService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    svc = buildService(w);
    w.orders.push({
      groceryOrderId: 'GO1',
      customerId: 'C1',
      pickupSlotId: 'SL1',
      status: 'WAIT_PAY',
      expireAt: String(Date.now() + 1000 * 60 * 10),
    } as unknown as GroceryOrder);
    w.orders.push({
      groceryOrderId: 'GO2',
      customerId: 'C1',
      pickupSlotId: 'SL1',
      status: 'PAID_WAIT_PICKUP',
      expireAt: '0',
    } as unknown as GroceryOrder);
    w.items.push({
      groceryOrderItemId: 'I1',
      groceryOrderId: 'GO1',
      productId: 'P1',
      estimatedQuantity: 2,
    } as unknown as GroceryOrderItem);
  });

  it('WAIT_PAY 用户可取消 → CANCELLED + 释放库存 + 释放时段', async () => {
    w.slots.find((s) => s.slotId === 'SL1')!.reserved = 1;
    const before = w.products.find((p) => p.productId === 'P1')!.stock;
    const r = await svc.cancel('C1', 'GO1', { reason: '不想要了' });
    expect(r.status).toBe('CANCELLED');
    expect(w.orders.find((o) => o.groceryOrderId === 'GO1')!.cancelledBy).toBe('customer');
    expect(w.products.find((p) => p.productId === 'P1')!.stock).toBe(before + 2);
    expect(w.slots.find((s) => s.slotId === 'SL1')!.reserved).toBe(0);
  });

  it('PAID_WAIT_PICKUP 不可取消 → NOT_CANCELLABLE', async () => {
    await expect(svc.cancel('C1', 'GO2', {})).rejects.toThrow(UnprocessableEntityException);
  });

  it('订单不属本人 → NotFound', async () => {
    await expect(svc.cancel('C2', 'GO1', {})).rejects.toThrow(NotFoundException);
  });

  it('订单不存在 → NotFound', async () => {
    await expect(svc.cancel('C1', 'GO_NONE', {})).rejects.toThrow(NotFoundException);
  });
});

describe('GroceryOrderService.cancelExpired', () => {
  let svc: GroceryOrderService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    svc = buildService(w);
    w.orders.push({
      groceryOrderId: 'GO_EXP1',
      customerId: 'C1',
      pickupSlotId: 'SL1',
      status: 'WAIT_PAY',
      expireAt: String(Date.now() - 1000),
    } as unknown as GroceryOrder);
    w.orders.push({
      groceryOrderId: 'GO_EXP2',
      customerId: 'C2',
      pickupSlotId: 'SL1',
      status: 'WAIT_PAY',
      expireAt: String(Date.now() - 2000),
    } as unknown as GroceryOrder);
    // 一个不过期的
    w.orders.push({
      groceryOrderId: 'GO_OK',
      customerId: 'C3',
      pickupSlotId: 'SL1',
      status: 'WAIT_PAY',
      expireAt: String(Date.now() + 10000),
    } as unknown as GroceryOrder);
    w.items.push(
      {
        groceryOrderItemId: 'I1',
        groceryOrderId: 'GO_EXP1',
        productId: 'P1',
        estimatedQuantity: 1,
      } as unknown as GroceryOrderItem,
      {
        groceryOrderItemId: 'I2',
        groceryOrderId: 'GO_EXP2',
        productId: 'P1',
        estimatedQuantity: 1,
      } as unknown as GroceryOrderItem,
    );
  });

  it('批量回滚过期单 → 返回数量 2', async () => {
    const n = await svc.cancelExpired();
    expect(n).toBe(2);
    expect(w.orders.find((o) => o.groceryOrderId === 'GO_EXP1')!.status).toBe('CANCELLED');
    expect(w.orders.find((o) => o.groceryOrderId === 'GO_EXP1')!.cancelledBy).toBe('system');
    expect(w.orders.find((o) => o.groceryOrderId === 'GO_EXP2')!.status).toBe('CANCELLED');
    expect(w.orders.find((o) => o.groceryOrderId === 'GO_OK')!.status).toBe('WAIT_PAY');
  });
});

describe('GroceryOrderService.applyPaid', () => {
  let svc: GroceryOrderService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    svc = buildService(w);
    w.orders.push({
      groceryOrderId: 'GO1',
      customerId: 'C1',
      pickupSlotId: 'SL1',
      status: 'WAIT_PAY',
      payStatus: 'unpaid',
      estimatedPayableAmount: '600',
      expireAt: String(Date.now() + 60000),
    } as unknown as GroceryOrder);
    w.orders.push({
      groceryOrderId: 'GO_PAID',
      customerId: 'C1',
      pickupSlotId: 'SL1',
      status: 'PAID_WAIT_PICKUP',
      payStatus: 'paid',
      estimatedPayableAmount: '600',
      expireAt: '0',
    } as unknown as GroceryOrder);
  });

  it('WAIT_PAY → PAID_WAIT_PICKUP + 6 位提货码 + sha256 hash', async () => {
    // 拿到 transaction 内的 em
    let capturedEm: EntityManager | null = null;
    // dataSource.transaction is already wired in buildService — but applyPaid 接收外部 em
    // 直接调一次 transaction 来取 em
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dsField: any = (svc as unknown as { dataSource: DataSource }).dataSource;
    await dsField.transaction(async (em: EntityManager) => {
      capturedEm = em;
    });
    const r = await svc.applyPaid(capturedEm!, 'GO1', 600, Date.now(), 'test-salt');
    expect(r.alreadyPaid).toBe(false);
    expect(r.pickupCode).toMatch(/^\d{6}$/);
    const o = w.orders.find((x) => x.groceryOrderId === 'GO1')!;
    expect(o.status).toBe('PAID_WAIT_PICKUP');
    expect(o.payStatus).toBe('paid');
    expect(o.pickupCode).toBe(r.pickupCode);
    // hash 必须是 64 位 hex
    expect(o.pickupCodeHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('已支付 → alreadyPaid=true', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dsField: any = (svc as unknown as { dataSource: DataSource }).dataSource;
    let capturedEm: EntityManager | null = null;
    await dsField.transaction(async (em: EntityManager) => {
      capturedEm = em;
    });
    const r = await svc.applyPaid(capturedEm!, 'GO_PAID', 600, Date.now(), 'test-salt');
    expect(r.alreadyPaid).toBe(true);
    expect(r.pickupCode).toBeUndefined();
  });

  it('非 WAIT_PAY 且未付 → NOT_WAIT_PAY', async () => {
    w.orders.push({
      groceryOrderId: 'GO_BAD',
      customerId: 'C1',
      pickupSlotId: 'SL1',
      status: 'CANCELLED',
      payStatus: 'unpaid',
      estimatedPayableAmount: '600',
      expireAt: '0',
    } as unknown as GroceryOrder);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dsField: any = (svc as unknown as { dataSource: DataSource }).dataSource;
    let capturedEm: EntityManager | null = null;
    await dsField.transaction(async (em: EntityManager) => {
      capturedEm = em;
    });
    await expect(svc.applyPaid(capturedEm!, 'GO_BAD', 600, Date.now(), 'test')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });
});
