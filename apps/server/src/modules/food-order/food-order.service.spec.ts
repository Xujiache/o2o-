import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type {
  CustomerAddress,
  FoodOrder,
  FoodOrderItem,
  OrderPriceSnapshot,
  OrderTimeline,
  Product,
  ProductSku,
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
  publishedEvents: Array<{ name: string; payload: unknown }>;
  redis: FakeRedis;
}

function buildService(w: World): FoodOrderService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchIn = (val: any, target: string): boolean => {
    if (!val) return true;
    if (typeof val === 'string') return val === target;
    const _value: string[] = (val as { _value?: string[] })._value ?? [];
    return _value.includes(target);
  };
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
  const orderRepo = {} as unknown as jest.Mocked<Repository<FoodOrder>>;
  let nextOrderId = 700001;

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
        };
      }
      if (name === 'FoodOrder') {
        return {
          insert: jest.fn(async (rec: Partial<FoodOrder>) => {
            const id = String(nextOrderId++);
            w.orders.push({ ...(rec as FoodOrder), foodOrderId: id });
            return { identifiers: [{ foodOrderId: id }], generatedMaps: [], raw: [] };
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
          insert: jest.fn(async (rec: Partial<StockLock>) => {
            w.stockLocks.push(rec as StockLock);
            return { identifiers: [], generatedMaps: [], raw: [] };
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

  return new FoodOrderService(
    storeRepo,
    addressRepo,
    productRepo,
    skuRepo,
    snapshotRepo,
    orderRepo,
    w.redis as unknown as never,
    dataSource,
    eventBus,
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

  it('成功试算 → previewId + 金额计算 + snapshot 写入 + Redis SETEX', async () => {
    const r = await svc.preview('10001', {
      storeId: '20001',
      items: [{ skuId: '9011', quantity: 2 }],
      addressId: '60001',
      deliveryType: 'instant',
    });
    expect(r.previewId).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.goodsAmount).toBe('5600');
    expect(r.deliveryFee).toBe('300');
    expect(r.payableAmount).toBe('5900');
    expect(world.snapshots).toHaveLength(1);
    expect([...world.redis.store.keys()][0]).toContain('food:preview:');
  });

  it('couponId 任意值 → INVALID_PARAM COUPON_NOT_AVAILABLE', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9011', quantity: 1 }],
        addressId: '60001',
        deliveryType: 'instant',
        couponId: 'C1',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('pointsUsed > 0 → INVALID_PARAM POINTS_NOT_AVAILABLE', async () => {
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

  it('店铺非 online → STATUS_INVALID STORE_CLOSED', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20002',
        items: [{ skuId: '9100', quantity: 1 }],
        addressId: '60001',
        deliveryType: 'instant',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('地址不属本人 → DATA_NOT_FOUND ADDRESS_NOT_FOUND', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9011', quantity: 1 }],
        addressId: '60099',
        deliveryType: 'instant',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('地址 cityCode 与 store 不一致 → STATUS_INVALID OUT_OF_DELIVERY_RANGE', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9011', quantity: 1 }],
        addressId: '60002',
        deliveryType: 'instant',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('sku 不属于 store → STATUS_INVALID SKU_STORE_MISMATCH', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9100', quantity: 1 }],
        addressId: '60001',
        deliveryType: 'instant',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('product 已下架 → STATUS_INVALID PRODUCT_NOT_ON_SHELF', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9020', quantity: 1 }],
        addressId: '60001',
        deliveryType: 'instant',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('库存不足 → STATUS_INVALID STOCK_INSUFFICIENT', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9012', quantity: 5 }],
        addressId: '60001',
        deliveryType: 'instant',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('未达起送金额 → STATUS_INVALID BELOW_MIN_ORDER', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9012', quantity: 1 }],
        addressId: '60001',
        deliveryType: 'instant',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('reserved 但 reservedTime 缺失或过去 → STATUS_INVALID RESERVED_TIME_PAST', async () => {
    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9011', quantity: 1 }],
        addressId: '60001',
        deliveryType: 'reserved',
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    await expect(
      svc.preview('10001', {
        storeId: '20001',
        items: [{ skuId: '9011', quantity: 1 }],
        addressId: '60001',
        deliveryType: 'reserved',
        reservedTime: Date.now() - 1000,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});

describe('FoodOrderService.submit', () => {
  let svc: FoodOrderService;
  let world: World;
  beforeEach(() => {
    world = makeWorld();
    svc = buildService(world);
  });

  function pushSnapshot(payload: OrderPriceSnapshotPayload, overrides: Partial<OrderPriceSnapshot> = {}): void {
    world.snapshots.push({
      orderPriceSnapshotId: String(world.snapshots.length + 1),
      previewId: overrides.previewId ?? 'preview-uuid-aaaaaaaa-aaaa-aaaa-aaaaaaaaaaaa',
      customerId: overrides.customerId ?? '10001',
      storeId: payload.storeId,
      payload,
      createdAt: String(Date.now()),
      expiresAt: overrides.expiresAt ?? String(Date.now() + 5 * 60 * 1000),
    } as OrderPriceSnapshot);
  }

  it('成功提交 → 写 food_order WAIT_PAY + items + stock_lock + timeline + 发 FoodOrderCreated', async () => {
    pushSnapshot(basicPayload());
    const r = await svc.submit('10001', {
      previewId: 'preview-uuid-aaaaaaaa-aaaa-aaaa-aaaaaaaaaaaa',
      payChannel: 'wxpay',
    });
    expect(r.orderId).toBeTruthy();
    expect(r.orderNo).toMatch(/^\d{8}\d{6}$/);
    expect(r.payableAmount).toBe('5900');
    expect(world.orders).toHaveLength(1);
    expect(world.orders[0]!.status).toBe('WAIT_PAY');
    expect(world.orderItems).toHaveLength(1);
    expect(world.stockLocks).toHaveLength(1);
    expect(world.stockLocks[0]!.status).toBe('active');
    expect(world.timelines).toHaveLength(1);
    expect(world.timelines[0]!.fromStatus).toBeNull();
    expect(world.timelines[0]!.toStatus).toBe('WAIT_PAY');
    expect(world.publishedEvents).toEqual([expect.objectContaining({ name: EventName.FoodOrderCreated })]);
  });

  it('snapshot 不存在 → STATUS_INVALID PREVIEW_NOT_FOUND', async () => {
    await expect(svc.submit('10001', { previewId: 'no-such-preview', payChannel: 'wxpay' })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('snapshot 不属本人 → PREVIEW_NOT_FOUND', async () => {
    pushSnapshot(basicPayload(), { customerId: '99999' });
    await expect(
      svc.submit('10001', { previewId: 'preview-uuid-aaaaaaaa-aaaa-aaaa-aaaaaaaaaaaa', payChannel: 'wxpay' }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('snapshot 过期 → PREVIEW_EXPIRED', async () => {
    pushSnapshot(basicPayload(), { expiresAt: String(Date.now() - 1000) });
    await expect(
      svc.submit('10001', { previewId: 'preview-uuid-aaaaaaaa-aaaa-aaaa-aaaaaaaaaaaa', payChannel: 'wxpay' }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('库存被抢光 → STATUS_INVALID STOCK_INSUFFICIENT_AT_SUBMIT', async () => {
    pushSnapshot(basicPayload({ items: [{ ...basicPayload().items[0]!, quantity: 99 }] }));
    await expect(
      svc.submit('10001', { previewId: 'preview-uuid-aaaaaaaa-aaaa-aaaa-aaaaaaaaaaaa', payChannel: 'wxpay' }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('orderNo 格式 yyyyMMdd + 6 位 daily seq', async () => {
    pushSnapshot(basicPayload());
    const r = await svc.submit('10001', {
      previewId: 'preview-uuid-aaaaaaaa-aaaa-aaaa-aaaaaaaaaaaa',
      payChannel: 'wxpay',
    });
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    expect(r.orderNo.startsWith(ymd)).toBe(true);
    expect(r.orderNo).toHaveLength(14);
  });

  it('多 sku 提交 → 锁定每个 sku 的 stockLocked 都 +quantity', async () => {
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
    pushSnapshot(payload);
    const sku11Before = world.skus.find((s) => s.skuId === '9011')!.stockLocked;
    const sku12Before = world.skus.find((s) => s.skuId === '9012')!.stockLocked;
    await svc.submit('10001', {
      previewId: 'preview-uuid-aaaaaaaa-aaaa-aaaa-aaaaaaaaaaaa',
      payChannel: 'wxpay',
    });
    expect(world.skus.find((s) => s.skuId === '9011')!.stockLocked).toBe(sku11Before + 1);
    expect(world.skus.find((s) => s.skuId === '9012')!.stockLocked).toBe(sku12Before + 1);
    expect(world.stockLocks).toHaveLength(2);
  });

  it('reserved 订单 → food_order.deliveryType=reserved + reservedTime 透传', async () => {
    const reservedAt = Date.now() + 60 * 60 * 1000;
    const payload = basicPayload({ deliveryType: 'reserved', reservedTime: String(reservedAt) });
    pushSnapshot(payload);
    await svc.submit('10001', {
      previewId: 'preview-uuid-aaaaaaaa-aaaa-aaaa-aaaaaaaaaaaa',
      payChannel: 'wxpay',
    });
    expect(world.orders[0]!.deliveryType).toBe('reserved');
    expect(world.orders[0]!.reservedTime).toBe(String(reservedAt));
  });

  it('订单 expireAt = createdAt + 15 min', async () => {
    pushSnapshot(basicPayload());
    const r = await svc.submit('10001', {
      previewId: 'preview-uuid-aaaaaaaa-aaaa-aaaa-aaaaaaaaaaaa',
      payChannel: 'wxpay',
    });
    expect(r.expireAt - Date.now()).toBeGreaterThan(14 * 60 * 1000);
    expect(r.expireAt - Date.now()).toBeLessThanOrEqual(15 * 60 * 1000 + 1000);
  });

  it('FoodOrderCreated 事件 payload 含 orderId/orderNo/customerId/storeId/payableAmount', async () => {
    pushSnapshot(basicPayload());
    const r = await svc.submit('10001', {
      previewId: 'preview-uuid-aaaaaaaa-aaaa-aaaa-aaaaaaaaaaaa',
      payChannel: 'wxpay',
    });
    expect(world.publishedEvents[0]!.payload).toEqual(
      expect.objectContaining({
        orderId: r.orderId,
        orderNo: r.orderNo,
        customerId: '10001',
        storeId: '20001',
        payableAmount: '5900',
      }),
    );
  });

  it('不同 previewId 多次提交 → 各自生成不同 orderNo(seq 递增)', async () => {
    pushSnapshot(basicPayload(), { previewId: 'preview-1' });
    pushSnapshot(basicPayload(), { previewId: 'preview-2' });
    const r1 = await svc.submit('10001', { previewId: 'preview-1', payChannel: 'wxpay' });
    const r2 = await svc.submit('10001', { previewId: 'preview-2', payChannel: 'alipay' });
    expect(r1.orderNo).not.toBe(r2.orderNo);
  });

  it('food_order.addressSnapshot 来自 snapshot.payload(快照不可变)', async () => {
    pushSnapshot(basicPayload());
    await svc.submit('10001', {
      previewId: 'preview-uuid-aaaaaaaa-aaaa-aaaa-aaaaaaaaaaaa',
      payChannel: 'wxpay',
    });
    expect(world.orders[0]!.addressSnapshot.consignee).toBe('张三');
    expect(world.orders[0]!.addressSnapshot.detail).toContain('朝阳');
  });
});
