import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type {
  CustomerAddress,
  FoodOrder,
  FoodOrderItem,
  OrderPriceSnapshot,
  OrderReview,
  OrderTimeline,
  PaymentOrder,
  Product,
  ProductSku,
  RefundOrder,
  StockLock,
  Store,
} from '../../database/entities';
import type { OrderPriceSnapshotPayload } from '../../database/entities/order-price-snapshot.entity';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import { FoodOrderService } from './food-order.service';

class FakeRedis {
  store = new Map<string, string>();
  counter = 0;
  async set(key: string, val: string): Promise<'OK'> {
    this.store.set(key, val);
    return 'OK';
  }
  async incr(_key: string): Promise<number> {
    this.counter += 1;
    return this.counter;
  }
  async expire(_key: string, _ttl: number): Promise<number> {
    return 1;
  }
}

interface World {
  stores: Store[];
  addresses: CustomerAddress[];
  products: Product[];
  skus: ProductSku[];
  snapshots: OrderPriceSnapshot[];
  orders: FoodOrder[];
  orderItems: FoodOrderItem[];
  stockLocks: StockLock[];
  timelines: OrderTimeline[];
  reviews: OrderReview[];
  payments: PaymentOrder[];
  refunds: RefundOrder[];
  publishedEvents: Array<{ name: string; payload: unknown }>;
  redis: FakeRedis;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const matchIn = (val: any, target: string): boolean => {
  if (!val) return true;
  if (typeof val === 'string') return val === target;
  const _value: string[] = (val as { _value?: string[] })._value ?? [];
  return _value.includes(target);
};

function buildService(w: World): FoodOrderService {
  let nextOrderId = 700001;
  let nextReviewId = 800001;

  const storeRepo = {
    findOne: jest.fn(({ where }: { where: Partial<Store> }) =>
      Promise.resolve(w.stores.find((s) => s.storeId === where.storeId) ?? null),
    ),
  } as unknown as jest.Mocked<Repository<Store>>;
  const addressRepo = {
    findOne: jest.fn(({ where }: { where: Partial<CustomerAddress> }) =>
      Promise.resolve(w.addresses.find((a) => a.addressId === where.addressId && a.userId === where.userId) ?? null),
    ),
  } as unknown as jest.Mocked<Repository<CustomerAddress>>;
  const productRepo = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    find: jest.fn(({ where }: { where: any }) =>
      Promise.resolve(w.products.filter((p) => matchIn(where.productId, p.productId))),
    ),
  } as unknown as jest.Mocked<Repository<Product>>;
  const skuRepo = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    find: jest.fn(({ where }: { where: any }) => Promise.resolve(w.skus.filter((s) => matchIn(where.skuId, s.skuId)))),
  } as unknown as jest.Mocked<Repository<ProductSku>>;
  const snapshotRepo = {
    findOne: jest.fn(({ where }: { where: Partial<OrderPriceSnapshot> }) =>
      Promise.resolve(w.snapshots.find((s) => s.previewId === where.previewId) ?? null),
    ),
    insert: jest.fn(async (rec: Partial<OrderPriceSnapshot>) => {
      w.snapshots.push(rec as OrderPriceSnapshot);
      return { identifiers: [], generatedMaps: [], raw: [] };
    }),
  } as unknown as jest.Mocked<Repository<OrderPriceSnapshot>>;
  const orderRepo = {
    findOne: jest.fn(({ where }: { where: Partial<FoodOrder> }) =>
      Promise.resolve(w.orders.find((o) => o.foodOrderId === where.foodOrderId) ?? null),
    ),
    createQueryBuilder: jest.fn(() => {
      const filters: { cid?: string; st?: string } = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qb: any = {};
      qb.where = jest.fn().mockImplementation((_sql: string, params?: { cid?: string }) => {
        if (params?.cid) filters.cid = params.cid;
        return qb;
      });
      qb.andWhere = jest.fn().mockImplementation((_sql: string, params?: { st?: string }) => {
        if (params?.st) filters.st = params.st;
        return qb;
      });
      qb.orderBy = jest.fn().mockImplementation(() => qb);
      let _skip = 0;
      let _take = 20;
      qb.skip = jest.fn().mockImplementation((n: number) => {
        _skip = n;
        return qb;
      });
      qb.take = jest.fn().mockImplementation((n: number) => {
        _take = n;
        return qb;
      });
      const filtered = (): FoodOrder[] => {
        let arr = w.orders.filter((o) => o.customerId === filters.cid);
        if (filters.st) arr = arr.filter((o) => o.status === filters.st);
        return arr.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      };
      qb.getCount = jest.fn().mockImplementation(async () => filtered().length);
      qb.getMany = jest.fn().mockImplementation(async () => filtered().slice(_skip, _skip + _take));
      return qb;
    }),
  } as unknown as jest.Mocked<Repository<FoodOrder>>;
  const orderItemRepo = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    find: jest.fn(({ where }: { where: any }) =>
      Promise.resolve(w.orderItems.filter((it) => matchIn(where.foodOrderId, it.foodOrderId))),
    ),
  } as unknown as jest.Mocked<Repository<FoodOrderItem>>;
  const timelineRepo = {
    find: jest.fn(({ where }: { where: Partial<OrderTimeline> }) =>
      Promise.resolve(w.timelines.filter((t) => t.orderId === where.orderId)),
    ),
  } as unknown as jest.Mocked<Repository<OrderTimeline>>;
  const reviewRepo = {
    findOne: jest.fn(({ where }: { where: Partial<OrderReview> }) =>
      Promise.resolve(w.reviews.find((r) => r.orderId === where.orderId) ?? null),
    ),
    insert: jest.fn(async (rec: Partial<OrderReview>) => {
      const id = String(nextReviewId++);
      w.reviews.push({ ...(rec as OrderReview), orderReviewId: id });
      return { identifiers: [{ orderReviewId: id }], generatedMaps: [], raw: [] };
    }),
  } as unknown as jest.Mocked<Repository<OrderReview>>;
  const paymentRepo = {
    findOne: jest.fn(({ where }: { where: Partial<PaymentOrder> }) =>
      Promise.resolve(
        w.payments.find(
          (p) => p.bizType === where.bizType && p.bizId === where.bizId && (!where.status || p.status === where.status),
        ) ?? null,
      ),
    ),
  } as unknown as jest.Mocked<Repository<PaymentOrder>>;
  const refundRepo = {} as unknown as jest.Mocked<Repository<RefundOrder>>;

  const fakeEm: Partial<EntityManager> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getRepository: jest.fn().mockImplementation((entity: any) => {
      const name: string = entity?.name ?? '';
      if (name === 'ProductSku') {
        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          createQueryBuilder: jest.fn(() => {
            const filters: { ids?: string[] } = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const qb: any = {};
            qb.where = jest.fn().mockImplementation((_sql: string, params?: { ids?: string[] }) => {
              if (params?.ids) filters.ids = params.ids;
              return qb;
            });
            qb.setLock = jest.fn().mockImplementation(() => qb);
            qb.getMany = jest.fn().mockImplementation(async () => w.skus.filter((s) => filters.ids?.includes(s.skuId)));
            return qb;
          }),
          increment: jest.fn(async (criteria: { skuId: string }, _field: string, by: number) => {
            const sku = w.skus.find((s) => s.skuId === criteria.skuId);
            if (sku) sku.stockLocked += by;
            return { affected: 1, raw: [] };
          }),
          decrement: jest.fn(async (criteria: { skuId: string }, _field: string, by: number) => {
            const sku = w.skus.find((s) => s.skuId === criteria.skuId);
            if (sku) sku.stockLocked = Math.max(0, sku.stockLocked - by);
            return { affected: 1, raw: [] };
          }),
        };
      }
      if (name === 'FoodOrder') {
        return {
          findOne: jest.fn(({ where }: { where: Partial<FoodOrder> }) =>
            Promise.resolve(w.orders.find((o) => o.foodOrderId === where.foodOrderId) ?? null),
          ),
          insert: jest.fn(async (rec: Partial<FoodOrder>) => {
            const id = String(nextOrderId++);
            w.orders.push({ ...(rec as FoodOrder), foodOrderId: id });
            return { identifiers: [{ foodOrderId: id }], generatedMaps: [], raw: [] };
          }),
          update: jest.fn(async (criteria: Partial<FoodOrder>, patch: Partial<FoodOrder>) => {
            const idx = w.orders.findIndex((o) => o.foodOrderId === criteria.foodOrderId);
            if (idx >= 0) w.orders[idx] = { ...w.orders[idx]!, ...patch };
            return { affected: 1, raw: [] };
          }),
        };
      }
      if (name === 'FoodOrderItem') {
        return {
          insert: jest.fn(async (rec: Partial<FoodOrderItem>) => {
            w.orderItems.push(rec as FoodOrderItem);
            return { identifiers: [], generatedMaps: [], raw: [] };
          }),
        };
      }
      if (name === 'StockLock') {
        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          find: jest.fn(({ where }: { where: any }) =>
            Promise.resolve(w.stockLocks.filter((l) => l.orderId === where.orderId && l.status === where.status)),
          ),
          insert: jest.fn(async (rec: Partial<StockLock>) => {
            w.stockLocks.push(rec as StockLock);
            return { identifiers: [], generatedMaps: [], raw: [] };
          }),
          update: jest.fn(async (criteria: Partial<StockLock>, patch: Partial<StockLock>) => {
            const idx = w.stockLocks.findIndex((l) => l.stockLockId === criteria.stockLockId);
            if (idx >= 0) w.stockLocks[idx] = { ...w.stockLocks[idx]!, ...patch };
            return { affected: 1, raw: [] };
          }),
        };
      }
      if (name === 'OrderTimeline') {
        return {
          insert: jest.fn(async (rec: Partial<OrderTimeline>) => {
            w.timelines.push(rec as OrderTimeline);
            return { identifiers: [], generatedMaps: [], raw: [] };
          }),
        };
      }
      if (name === 'RefundOrder') {
        return {
          insert: jest.fn(async (rec: Partial<RefundOrder>) => {
            const refundId = `RF${Date.now()}`;
            w.refunds.push({ ...(rec as RefundOrder), refundOrderId: refundId });
            return { identifiers: [{ refundOrderId: refundId }], generatedMaps: [], raw: [] };
          }),
        };
      }
      if (name === 'PaymentOrder') {
        return {
          update: jest.fn(async (criteria: Partial<PaymentOrder>, patch: Partial<PaymentOrder>) => {
            const idx = w.payments.findIndex((p) => p.paymentOrderId === criteria.paymentOrderId);
            if (idx >= 0) w.payments[idx] = { ...w.payments[idx]!, ...patch };
            return { affected: 1, raw: [] };
          }),
        };
      }
      return {};
    }),
  };
  const dataSource = {
    transaction: jest.fn(async (cb: (em: EntityManager) => Promise<unknown>) => cb(fakeEm as EntityManager)),
  } as unknown as jest.Mocked<DataSource>;
  const eventBus = {
    publish: jest.fn(async (name: string, payload: unknown) => {
      w.publishedEvents.push({ name, payload });
      return { eventId: 'evt' };
    }),
  } as unknown as jest.Mocked<DomainEventBus>;

  const couponService = {
    lockCoupons: jest.fn(async () => undefined),
    releaseCoupons: jest.fn(async () => 0),
    consumeCoupons: jest.fn(async () => 0),
  } as unknown as never;
  const couponCustomerService = {
    validateForOrder: jest.fn(async () => {
      throw new Error('validateForOrder not stubbed in this test');
    }),
  } as unknown as never;

  return new FoodOrderService(
    storeRepo,
    addressRepo,
    productRepo,
    skuRepo,
    snapshotRepo,
    orderRepo,
    orderItemRepo,
    timelineRepo,
    reviewRepo,
    paymentRepo,
    refundRepo,
    w.redis as unknown as never,
    dataSource,
    eventBus,
    couponService,
    couponCustomerService,
  );
}

function makeWorld(): World {
  return {
    stores: [
      {
        storeId: '20001',
        businessStatus: 'online',
        cityCode: 'BJ',
        deliveryFee: '300',
        minOrderAmount: '2000',
      } as unknown as Store,
      {
        storeId: '20002',
        businessStatus: 'paused',
        cityCode: 'BJ',
        deliveryFee: '0',
        minOrderAmount: '0',
      } as unknown as Store,
    ],
    addresses: [
      {
        addressId: '60001',
        userId: '10001',
        cityCode: 'BJ',
        receiverName: '张三',
        mobile: '13800000001',
        detail: '北京市朝阳区',
        lng: '116.4',
        lat: '39.9',
      } as unknown as CustomerAddress,
      {
        addressId: '60002',
        userId: '10001',
        cityCode: 'SH',
        receiverName: '李四',
        mobile: '13800000002',
        detail: '上海市',
        lng: '121',
        lat: '31',
      } as unknown as CustomerAddress,
      {
        addressId: '60099',
        userId: '99999',
        cityCode: 'BJ',
        receiverName: '别人',
        mobile: '13800000099',
        detail: '别人的地址',
        lng: '116',
        lat: '39',
      } as unknown as CustomerAddress,
    ],
    products: [
      {
        productId: '901',
        storeId: '20001',
        name: '汉堡',
        saleStatus: 'on_shelf',
        coverImageFileId: 'fid',
      } as unknown as Product,
      {
        productId: '902',
        storeId: '20001',
        name: '已下架',
        saleStatus: 'off_shelf',
        coverImageFileId: null,
      } as unknown as Product,
      {
        productId: '910',
        storeId: '20002',
        name: '其他店',
        saleStatus: 'on_shelf',
        coverImageFileId: null,
      } as unknown as Product,
    ],
    skus: [
      {
        skuId: '9011',
        productId: '901',
        specValue: '大份',
        price: '2800',
        stock: 50,
        stockLocked: 10,
      } as unknown as ProductSku,
      {
        skuId: '9012',
        productId: '901',
        specValue: '小份',
        price: '1500',
        stock: 5,
        stockLocked: 4,
      } as unknown as ProductSku,
      {
        skuId: '9020',
        productId: '902',
        specValue: '默认',
        price: '500',
        stock: 50,
        stockLocked: 0,
      } as unknown as ProductSku,
      {
        skuId: '9100',
        productId: '910',
        specValue: '默认',
        price: '1000',
        stock: 20,
        stockLocked: 0,
      } as unknown as ProductSku,
    ],
    snapshots: [],
    orders: [],
    orderItems: [],
    stockLocks: [],
    timelines: [],
    reviews: [],
    payments: [],
    refunds: [],
    publishedEvents: [],
    redis: new FakeRedis(),
  };
}

function basicPayload(overrides: Partial<OrderPriceSnapshotPayload> = {}): OrderPriceSnapshotPayload {
  return {
    storeId: '20001',
    cityCode: 'BJ',
    items: [
      {
        skuId: '9011',
        productId: '901',
        quantity: 2,
        unitPrice: '2800',
        subTotal: '5600',
        skuSnapshot: { name: '汉堡', price: 2800, spec: '大份', iconUrl: 'fid', productName: '汉堡' },
      },
    ],
    goodsAmount: '5600',
    deliveryFee: '300',
    discountAmount: '0',
    payableAmount: '5900',
    estimatedDeliveryTime: 40,
    deliveryType: 'instant',
    reservedTime: null,
    addressSnapshot: {
      addressId: '60001',
      consignee: '张三',
      mobile: '13800000001',
      province: '',
      city: '',
      district: '',
      detail: '北京市朝阳区',
      lng: 116.4,
      lat: 39.9,
    },
    ...overrides,
  };
}

describe('FoodOrderService.preview', () => {
  let svc: FoodOrderService;
  let world: World;
  beforeEach(() => {
    world = makeWorld();
    svc = buildService(world);
  });

  it('成功试算 → previewId + 金额 + snapshot 写入 + Redis SETEX', async () => {
    const r = await svc.preview('10001', {
      storeId: '20001',
      items: [{ skuId: '9011', quantity: 2 }],
      addressId: '60001',
      deliveryType: 'instant',
    });
    expect(r.previewId).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.payableAmount).toBe('5900');
    expect(world.snapshots).toHaveLength(1);
    expect([...world.redis.store.keys()][0]).toContain('food:preview:');
  });

  it('couponId 校验失败 → INVALID_PARAM(由 CouponCustomerService.validateForOrder 抛)', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9011', quantity: 1 }],
        addressId: '60001',
        deliveryType: 'instant',
        couponId: 'C1',
      }),
    ).rejects.toThrow();
  });

  it('pointsUsed → INVALID_PARAM', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9011', quantity: 1 }],
        addressId: '60001',
        deliveryType: 'instant',
        pointsUsed: 100,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('店铺不存在 → DATA_NOT_FOUND', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '99999',
        items: [{ skuId: '9011', quantity: 1 }],
        addressId: '60001',
        deliveryType: 'instant',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('店铺非 online → STORE_CLOSED', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20002',
        items: [{ skuId: '9100', quantity: 1 }],
        addressId: '60001',
        deliveryType: 'instant',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('地址不属本人 → DATA_NOT_FOUND', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9011', quantity: 1 }],
        addressId: '60099',
        deliveryType: 'instant',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('cityCode 不一致 → OUT_OF_DELIVERY_RANGE', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9011', quantity: 1 }],
        addressId: '60002',
        deliveryType: 'instant',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('sku 不属于 store → SKU_STORE_MISMATCH', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9100', quantity: 1 }],
        addressId: '60001',
        deliveryType: 'instant',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('product 已下架 → PRODUCT_NOT_ON_SHELF', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9020', quantity: 1 }],
        addressId: '60001',
        deliveryType: 'instant',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('库存不足 → STOCK_INSUFFICIENT', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9012', quantity: 5 }],
        addressId: '60001',
        deliveryType: 'instant',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('未达起送 → BELOW_MIN_ORDER', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9012', quantity: 1 }],
        addressId: '60001',
        deliveryType: 'instant',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('reserved 必填 → RESERVED_TIME_PAST', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9011', quantity: 1 }],
        addressId: '60001',
        deliveryType: 'reserved',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});

function pushSnapshot(
  w: World,
  payload: OrderPriceSnapshotPayload,
  overrides: Partial<OrderPriceSnapshot> = {},
): string {
  const previewId = overrides.previewId ?? `preview-uuid-${w.snapshots.length + 1}`;
  w.snapshots.push({
    orderPriceSnapshotId: String(w.snapshots.length + 1),
    previewId,
    customerId: overrides.customerId ?? '10001',
    storeId: payload.storeId,
    payload,
    createdAt: String(Date.now()),
    expiresAt: overrides.expiresAt ?? String(Date.now() + 5 * 60 * 1000),
  } as OrderPriceSnapshot);
  return previewId;
}

describe('FoodOrderService.submit', () => {
  let svc: FoodOrderService;
  let world: World;
  beforeEach(() => {
    world = makeWorld();
    svc = buildService(world);
  });

  it('成功 → food_order WAIT_PAY + items + stock_lock + timeline + FoodOrderCreated', async () => {
    const pid = pushSnapshot(world, basicPayload());
    const r = await svc.submit('10001', { previewId: pid, payChannel: 'wxpay' });
    expect(r.orderNo).toMatch(/^\d{8}\d{6}$/);
    expect(world.orders[0]!.status).toBe('WAIT_PAY');
    expect(world.stockLocks[0]!.status).toBe('active');
    expect(world.timelines[0]!.toStatus).toBe('WAIT_PAY');
    expect(world.publishedEvents.map((e) => e.name)).toEqual([EventName.FoodOrderCreated]);
  });

  it('snapshot 不存在 → PREVIEW_NOT_FOUND', async () => {
    await expect(svc.submit('10001', { previewId: 'no', payChannel: 'wxpay' })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('snapshot 不属本人 → PREVIEW_NOT_FOUND', async () => {
    const pid = pushSnapshot(world, basicPayload(), { customerId: '99999' });
    await expect(svc.submit('10001', { previewId: pid, payChannel: 'wxpay' })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('snapshot 过期 → PREVIEW_EXPIRED', async () => {
    const pid = pushSnapshot(world, basicPayload(), { expiresAt: String(Date.now() - 1000) });
    await expect(svc.submit('10001', { previewId: pid, payChannel: 'wxpay' })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('库存被抢光 → STOCK_INSUFFICIENT_AT_SUBMIT', async () => {
    const pid = pushSnapshot(world, basicPayload({ items: [{ ...basicPayload().items[0]!, quantity: 99 }] }));
    await expect(svc.submit('10001', { previewId: pid, payChannel: 'wxpay' })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('orderNo 格式 yyyyMMdd + 6 位 daily seq', async () => {
    const pid = pushSnapshot(world, basicPayload());
    const r = await svc.submit('10001', { previewId: pid, payChannel: 'wxpay' });
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    expect(r.orderNo.startsWith(ymd)).toBe(true);
    expect(r.orderNo).toHaveLength(14);
  });

  it('多 sku → 锁每个 sku 的 stockLocked +q', async () => {
    const payload = basicPayload({
      items: [
        {
          skuId: '9011',
          productId: '901',
          quantity: 1,
          unitPrice: '2800',
          subTotal: '2800',
          skuSnapshot: { name: '汉堡', price: 2800, spec: '大份', iconUrl: 'fid' },
        },
        {
          skuId: '9012',
          productId: '901',
          quantity: 1,
          unitPrice: '1500',
          subTotal: '1500',
          skuSnapshot: { name: '汉堡', price: 1500, spec: '小份', iconUrl: 'fid' },
        },
      ],
      goodsAmount: '4300',
      payableAmount: '4600',
    });
    const before11 = world.skus[0]!.stockLocked;
    const before12 = world.skus[1]!.stockLocked;
    const pid = pushSnapshot(world, payload);
    await svc.submit('10001', { previewId: pid, payChannel: 'wxpay' });
    expect(world.skus[0]!.stockLocked).toBe(before11 + 1);
    expect(world.skus[1]!.stockLocked).toBe(before12 + 1);
    expect(world.stockLocks).toHaveLength(2);
  });

  it('reserved → deliveryType + reservedTime 透传', async () => {
    const reservedAt = Date.now() + 60 * 60 * 1000;
    const pid = pushSnapshot(world, basicPayload({ deliveryType: 'reserved', reservedTime: String(reservedAt) }));
    await svc.submit('10001', { previewId: pid, payChannel: 'wxpay' });
    expect(world.orders[0]!.deliveryType).toBe('reserved');
    expect(world.orders[0]!.reservedTime).toBe(String(reservedAt));
  });

  it('订单 expireAt = now + 15min', async () => {
    const pid = pushSnapshot(world, basicPayload());
    const r = await svc.submit('10001', { previewId: pid, payChannel: 'wxpay' });
    expect(r.expireAt - Date.now()).toBeGreaterThan(14 * 60 * 1000);
    expect(r.expireAt - Date.now()).toBeLessThanOrEqual(15 * 60 * 1000 + 1000);
  });

  it('FoodOrderCreated payload 含关键字段', async () => {
    const pid = pushSnapshot(world, basicPayload());
    const r = await svc.submit('10001', { previewId: pid, payChannel: 'wxpay' });
    expect(world.publishedEvents[0]!.payload).toEqual(
      expect.objectContaining({ orderId: r.orderId, orderNo: r.orderNo, customerId: '10001' }),
    );
  });

  it('不同 previewId 各自不同 orderNo', async () => {
    const p1 = pushSnapshot(world, basicPayload(), { previewId: 'preview-1' });
    const p2 = pushSnapshot(world, basicPayload(), { previewId: 'preview-2' });
    const r1 = await svc.submit('10001', { previewId: p1, payChannel: 'wxpay' });
    const r2 = await svc.submit('10001', { previewId: p2, payChannel: 'alipay' });
    expect(r1.orderNo).not.toBe(r2.orderNo);
  });

  it('addressSnapshot 来自 snapshot.payload', async () => {
    const pid = pushSnapshot(world, basicPayload());
    await svc.submit('10001', { previewId: pid, payChannel: 'wxpay' });
    expect(world.orders[0]!.addressSnapshot.consignee).toBe('张三');
  });
});

// === T12 list/detail ===

describe('FoodOrderService.list', () => {
  let svc: FoodOrderService;
  let world: World;
  beforeEach(() => {
    world = makeWorld();
    world.orders.push(
      {
        foodOrderId: '700001',
        orderNo: '20260506000001',
        customerId: '10001',
        storeId: '20001',
        status: 'WAIT_PAY',
        payStatus: 'unpaid',
        goodsAmount: '5600',
        payableAmount: '5900',
        expireAt: String(Date.now() + 10 * 60 * 1000),
        createdAt: '5000',
      } as unknown as FoodOrder,
      {
        foodOrderId: '700002',
        orderNo: '20260506000002',
        customerId: '10001',
        storeId: '20001',
        status: 'COMPLETED',
        payStatus: 'paid',
        goodsAmount: '3000',
        payableAmount: '3300',
        expireAt: '0',
        createdAt: '4000',
      } as unknown as FoodOrder,
      {
        foodOrderId: '700003',
        orderNo: '20260506000003',
        customerId: '99999',
        storeId: '20001',
        status: 'WAIT_PAY',
        payStatus: 'unpaid',
        goodsAmount: '0',
        payableAmount: '0',
        expireAt: '0',
        createdAt: '3000',
      } as unknown as FoodOrder,
    );
    world.orderItems.push({
      foodOrderItemId: '1',
      foodOrderId: '700001',
      skuId: '9011',
      productId: '901',
      skuSnapshot: { name: '汉堡', price: 2800, spec: '大份', iconUrl: 'fid' },
      quantity: 2,
      unitPrice: '2800',
      subTotal: '5600',
    } as unknown as FoodOrderItem);
    svc = buildService(world);
  });

  it('list 默认返本人订单(按 created_at DESC)', async () => {
    const r = await svc.list('10001', {});
    expect(r.total).toBe(2);
    expect(r.list[0]!.orderId).toBe('700001'); // 5000 > 4000
  });

  it('list status 筛选只返 COMPLETED', async () => {
    const r = await svc.list('10001', { status: 'COMPLETED' });
    expect(r.total).toBe(1);
    expect(r.list[0]!.orderId).toBe('700002');
  });

  it('list 不返其他用户订单', async () => {
    const r = await svc.list('10001', {});
    expect(r.list.find((o) => o.orderId === '700003')).toBeUndefined();
  });

  it('list itemsBrief 有商品概要', async () => {
    const r = await svc.list('10001', {});
    const o = r.list.find((x) => x.orderId === '700001')!;
    expect(o.itemsBrief).toContain('汉堡');
  });
});

describe('FoodOrderService.detail', () => {
  let svc: FoodOrderService;
  let world: World;
  beforeEach(() => {
    world = makeWorld();
    world.orders.push({
      foodOrderId: '700001',
      orderNo: '20260506000001',
      customerId: '10001',
      storeId: '20001',
      status: 'WAIT_PAY',
      payStatus: 'unpaid',
      goodsAmount: '5600',
      deliveryFee: '300',
      discountAmount: '0',
      payableAmount: '5900',
      addressSnapshot: { addressId: '60001', consignee: '张三', mobile: '13800', detail: '北京' },
      expireAt: String(Date.now() + 10 * 60 * 1000),
      createdAt: '5000',
      updatedAt: '5000',
    } as unknown as FoodOrder);
    world.orderItems.push({
      foodOrderItemId: '1',
      foodOrderId: '700001',
      skuId: '9011',
      productId: '901',
      skuSnapshot: { name: '汉堡', price: 2800, spec: '大份', iconUrl: 'fid' },
      quantity: 2,
      unitPrice: '2800',
      subTotal: '5600',
    } as unknown as FoodOrderItem);
    world.timelines.push({
      orderTimelineId: '1',
      orderId: '700001',
      bizType: 'FOOD',
      fromStatus: null,
      toStatus: 'WAIT_PAY',
      actorType: 'customer',
      actorId: '10001',
      reason: 'order submitted',
      createdAt: '5000',
    } as unknown as OrderTimeline);
    world.payments.push({
      paymentOrderId: '800001',
      payOrderNo: 'P20260506100000000001',
      bizType: 'FOOD',
      bizId: '700001',
      payChannel: 'wxpay',
      payableAmount: '5900',
      status: 'pending',
    } as unknown as PaymentOrder);
    svc = buildService(world);
  });

  it('成功 → 含 timeline + payment + actions', async () => {
    const r = await svc.detail('10001', '700001');
    expect(r.orderId).toBe('700001');
    expect(r.items).toHaveLength(1);
    expect(r.timeline).toHaveLength(1);
    expect(r.timeline[0]!.toStatus).toBe('WAIT_PAY');
    expect(r.payment?.payChannel).toBe('wxpay');
    expect(r.actions).toContain('pay');
    expect(r.actions).toContain('cancel');
  });

  it('订单不属本人 → DATA_NOT_FOUND', async () => {
    await expect(svc.detail('99999', '700001')).rejects.toThrow(NotFoundException);
  });
});

// === T13 cancel ===

describe('FoodOrderService.cancel', () => {
  let svc: FoodOrderService;
  let world: World;
  beforeEach(() => {
    world = makeWorld();
    world.orders.push(
      {
        foodOrderId: '700001',
        customerId: '10001',
        storeId: '20001',
        status: 'WAIT_PAY',
        payStatus: 'unpaid',
        expireAt: String(Date.now() + 10 * 60 * 1000),
        createdAt: '0',
        updatedAt: '0',
      } as unknown as FoodOrder,
      {
        foodOrderId: '700002',
        customerId: '10001',
        storeId: '20001',
        status: 'PAID_WAIT_MERCHANT',
        payStatus: 'paid',
        expireAt: '0',
        createdAt: '0',
        updatedAt: '0',
      } as unknown as FoodOrder,
    );
    world.stockLocks.push({
      stockLockId: '900001',
      orderId: '700001',
      skuId: '9011',
      quantity: 2,
      status: 'active',
      createdAt: '0',
    } as unknown as StockLock);
    svc = buildService(world);
  });

  it('WAIT_PAY 用户取消 → CANCELLED + stock_lock released + 2 事件', async () => {
    const r = await svc.cancel('10001', '700001', { reason: "don't want" });
    expect(r.status).toBe('CANCELLED');
    expect(world.orders[0]!.status).toBe('CANCELLED');
    expect(world.orders[0]!.cancelledBy).toBe('customer');
    expect(world.stockLocks[0]!.status).toBe('released');
    expect(world.skus[0]!.stockLocked).toBe(8); // 10 - 2
    expect(world.timelines[0]!.fromStatus).toBe('WAIT_PAY');
    expect(world.timelines[0]!.toStatus).toBe('CANCELLED');
    expect(world.publishedEvents.map((e) => e.name)).toEqual([EventName.FoodOrderCancelled, EventName.StockReleased]);
  });

  it('PAID_WAIT_MERCHANT 不允许用户取消 → INVALID_TRANSITION', async () => {
    await expect(svc.cancel('10001', '700002', {})).rejects.toThrow(UnprocessableEntityException);
  });

  it('订单不属本人 → DATA_NOT_FOUND', async () => {
    await expect(svc.cancel('99999', '700001', {})).rejects.toThrow(NotFoundException);
  });

  it('订单不存在 → DATA_NOT_FOUND', async () => {
    await expect(svc.cancel('10001', '999999', {})).rejects.toThrow(NotFoundException);
  });

  it('无 active stock_lock 时不发 StockReleased 事件', async () => {
    world.orders.push({
      foodOrderId: '700099',
      customerId: '10001',
      storeId: '20001',
      status: 'WAIT_PAY',
      expireAt: String(Date.now() + 10 * 60 * 1000),
      createdAt: '0',
    } as unknown as FoodOrder);
    await svc.cancel('10001', '700099', {});
    const events = world.publishedEvents.map((e) => e.name);
    expect(events).toContain(EventName.FoodOrderCancelled);
    expect(events).not.toContain(EventName.StockReleased);
  });

  it('reason 缺省 → 默认 CUSTOMER_CANCEL', async () => {
    await svc.cancel('10001', '700001', {});
    expect(world.orders[0]!.cancelledReason).toBe('CUSTOMER_CANCEL');
  });
});

// === T14 review ===

describe('FoodOrderService.review', () => {
  let svc: FoodOrderService;
  let world: World;
  beforeEach(() => {
    world = makeWorld();
    world.orders.push(
      {
        foodOrderId: '700001',
        customerId: '10001',
        storeId: '20001',
        status: 'COMPLETED',
        completedAt: String(Date.now() - 24 * 60 * 60 * 1000),
        updatedAt: String(Date.now() - 24 * 60 * 60 * 1000),
      } as unknown as FoodOrder,
      {
        foodOrderId: '700002',
        customerId: '10001',
        storeId: '20001',
        status: 'WAIT_PAY',
        completedAt: null,
        updatedAt: '0',
      } as unknown as FoodOrder,
      {
        foodOrderId: '700003',
        customerId: '10001',
        storeId: '20001',
        status: 'COMPLETED',
        completedAt: String(Date.now() - 31 * 24 * 60 * 60 * 1000),
        updatedAt: String(Date.now() - 31 * 24 * 60 * 60 * 1000),
      } as unknown as FoodOrder,
    );
    svc = buildService(world);
  });

  it('成功 → 写 order_review + FoodReviewCreated 事件', async () => {
    const r = await svc.review('10001', '700001', { rating: 5, content: '好吃' });
    expect(r.reviewId).toBeTruthy();
    expect(world.reviews).toHaveLength(1);
    expect(world.reviews[0]!.rating).toBe(5);
    expect(world.publishedEvents.map((e) => e.name)).toEqual([EventName.FoodReviewCreated]);
  });

  it('非 COMPLETED → NOT_COMPLETED', async () => {
    await expect(svc.review('10001', '700002', { rating: 5 })).rejects.toThrow(UnprocessableEntityException);
  });

  it('30 天过期 → REVIEW_EXPIRED', async () => {
    await expect(svc.review('10001', '700003', { rating: 5 })).rejects.toThrow(UnprocessableEntityException);
  });

  it('重复评 → ALREADY_REVIEWED', async () => {
    await svc.review('10001', '700001', { rating: 5 });
    await expect(svc.review('10001', '700001', { rating: 4 })).rejects.toThrow(UnprocessableEntityException);
  });

  it('订单不属本人 → DATA_NOT_FOUND', async () => {
    await expect(svc.review('99999', '700001', { rating: 5 })).rejects.toThrow(NotFoundException);
  });

  it('anonymous=true → 写入 anonymous=1', async () => {
    await svc.review('10001', '700001', { rating: 4, anonymous: true });
    expect(world.reviews[0]!.anonymous).toBe(1);
  });
});
