import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type { Product, ProductSku, StockRecord, Store } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import { StockService } from './stock.service';

describe('StockService', () => {
  let svc: StockService;
  let products: Product[];
  let skus: ProductSku[];
  let records: StockRecord[];
  let stores: Store[];
  let publishedEvents: Array<{ name: string; payload: unknown }>;

  let productRepo: jest.Mocked<Repository<Product>>;
  let skuRepo: jest.Mocked<Repository<ProductSku>>;
  let recordRepo: jest.Mocked<Repository<StockRecord>>;
  let storeRepo: jest.Mocked<Repository<Store>>;
  let dataSource: { transaction: jest.Mock };
  let bus: jest.Mocked<DomainEventBus>;

  beforeEach(() => {
    products = [
      {
        productId: '100',
        storeId: '201',
        categoryId: '1',
        name: '炒面',
        price: '1500',
        stock: 10,
        stockAlertThreshold: 5,
        hasSku: 0,
        saleStatus: 'on_shelf',
        updatedAt: '0',
      } as Product,
    ];
    skus = [];
    records = [];
    stores = [{ storeId: '201', merchantId: '1' } as Store];
    publishedEvents = [];

    productRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<Product> }) => products.find((p) => p.productId === where.productId) ?? null,
      ),
      find: jest.fn(async () => products),
      update: jest.fn(async (criteria: Partial<Product>, patch: Partial<Product>) => {
        const p = products.find((x) => x.productId === criteria.productId);
        if (p) Object.assign(p, patch);
        return { affected: p ? 1 : 0 };
      }),
    } as unknown as jest.Mocked<Repository<Product>>;

    skuRepo = {} as never;
    recordRepo = {} as never;

    storeRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<Store> }) =>
          stores.find(
            (s) =>
              (where.merchantId ? s.merchantId === where.merchantId : true) &&
              (where.storeId ? s.storeId === where.storeId : true),
          ) ?? null,
      ),
    } as unknown as jest.Mocked<Repository<Store>>;

    const txProductRepo = {
      findOne: async ({ where }: { where: Partial<Product> }) =>
        products.find((p) => p.productId === where.productId) ?? null,
      update: async (criteria: Partial<Product>, patch: Partial<Product>) => {
        const p = products.find((x) => x.productId === criteria.productId);
        if (p) Object.assign(p, patch);
        return { affected: p ? 1 : 0 };
      },
    };
    const txSkuRepo = {
      findOne: async ({ where }: { where: Partial<ProductSku> }) => skus.find((s) => s.skuId === where.skuId) ?? null,
      update: async () => ({ affected: 1 }),
    };
    const txRecordRepo = {
      insert: async (r: Partial<StockRecord>) => {
        records.push(r as StockRecord);
        return { identifiers: [] };
      },
    };

    dataSource = {
      transaction: jest.fn(async (cb: (em: EntityManager) => Promise<unknown>) => {
        const em = {
          getRepository: (target: unknown) => {
            const name = (target as { name?: string }).name;
            if (name === 'Product') return txProductRepo;
            if (name === 'ProductSku') return txSkuRepo;
            if (name === 'StockRecord') return txRecordRepo;
            return {} as never;
          },
        } as unknown as EntityManager;
        return cb(em);
      }),
    };

    bus = {
      publish: jest.fn(async (name: string, payload: unknown) => {
        publishedEvents.push({ name, payload });
        return { eventId: 'evt' };
      }),
    } as unknown as jest.Mocked<DomainEventBus>;

    svc = new StockService(productRepo, skuRepo, recordRepo, storeRepo, dataSource as unknown as DataSource, bus);
  });

  it('adjust 增加库存:写流水 + 不发事件', async () => {
    await svc.adjust('100', null, +5, 'init', 'system', 'system');
    expect(products[0]!.stock).toBe(15);
    expect(records).toHaveLength(1);
    expect(records[0]!.quantityChange).toBe(5);
    expect(publishedEvents).toHaveLength(0);
  });

  it('adjust 扣到 0:置 sold_out + 发 ProductOnSale', async () => {
    await svc.adjust('100', null, -10, 'order_deduct', 'system', 'system');
    expect(products[0]!.stock).toBe(0);
    expect(products[0]!.saleStatus).toBe('sold_out');
    expect(publishedEvents).toEqual([
      expect.objectContaining({
        name: EventName.ProductOnSale,
        payload: expect.objectContaining({ saleStatus: 'sold_out' }),
      }),
    ]);
  });

  it('adjust 扣到低于阈值(>0):发 StockLow', async () => {
    await svc.adjust('100', null, -7, 'order_deduct', 'system', 'system');
    expect(products[0]!.stock).toBe(3);
    expect(publishedEvents.find((e) => e.name === EventName.StockLow)).toBeTruthy();
  });

  it('adjust 库存不可为负 → STATUS_INVALID', async () => {
    await expect(svc.adjust('100', null, -100, 'x', 'system', 'system')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('adjust 商品不存在 → NotFound', async () => {
    await expect(svc.adjust('999', null, 1, 'x', 'system', 'system')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('setThreshold 跨商家 → FORBIDDEN', async () => {
    await expect(svc.setThreshold('999', '100', 8)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('setThreshold 成功更新', async () => {
    const r = await svc.setThreshold('1', '100', 8);
    expect(r.threshold).toBe(8);
    expect(products[0]!.stockAlertThreshold).toBe(8);
  });
});
