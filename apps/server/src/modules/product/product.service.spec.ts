import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type { MerchantPromotion, Product, ProductCategory, ProductSku, Store } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import { ProductService } from './product.service';

describe('ProductService', () => {
  let svc: ProductService;
  let stores: Store[];
  let cats: ProductCategory[];
  let products: Product[];
  let skus: ProductSku[];
  let promos: MerchantPromotion[];
  let publishedEvents: Array<{ name: string; payload: unknown }>;
  let nextCatId = 1;
  let nextProductId = 100;

  let storeRepo: jest.Mocked<Repository<Store>>;
  let catRepo: jest.Mocked<Repository<ProductCategory>>;
  let productRepo: jest.Mocked<Repository<Product>>;
  let skuRepo: jest.Mocked<Repository<ProductSku>>;
  let promoRepo: jest.Mocked<Repository<MerchantPromotion>>;
  let dataSource: { transaction: jest.Mock };
  let bus: jest.Mocked<DomainEventBus>;

  beforeEach(() => {
    stores = [{ storeId: '201', merchantId: '1' } as Store, { storeId: '202', merchantId: '2' } as Store];
    cats = [{ categoryId: '1', storeId: '201', name: '主食', displayOrder: 0 } as ProductCategory];
    products = [];
    skus = [];
    promos = [];
    publishedEvents = [];
    nextCatId = 2;
    nextProductId = 100;

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

    catRepo = {
      find: jest.fn(async ({ where }: { where: Partial<ProductCategory> }) =>
        cats.filter((c) => c.storeId === where.storeId),
      ),
      findOne: jest.fn(
        async ({ where }: { where: Partial<ProductCategory> }) =>
          cats.find((c) => c.categoryId === where.categoryId) ?? null,
      ),
      create: jest.fn((dto: Partial<ProductCategory>) => dto as ProductCategory),
      save: jest.fn(async (c: ProductCategory) => {
        const saved = { ...c, categoryId: String(nextCatId++) };
        cats.push(saved);
        return saved;
      }),
      delete: jest.fn(async ({ categoryId }: { categoryId: string }) => {
        const idx = cats.findIndex((c) => c.categoryId === categoryId);
        if (idx >= 0) cats.splice(idx, 1);
        return { affected: idx >= 0 ? 1 : 0 };
      }),
    } as unknown as jest.Mocked<Repository<ProductCategory>>;

    productRepo = {
      count: jest.fn(
        async ({ where }: { where: Partial<Product> }) =>
          products.filter((p) => p.categoryId === where.categoryId).length,
      ),
      findOne: jest.fn(
        async ({ where }: { where: Partial<Product> }) => products.find((p) => p.productId === where.productId) ?? null,
      ),
      find: jest.fn(async ({ where }: { where: { productId: { _value: string[] } } }) => {
        const ids = (where.productId as unknown as { _value: string[] })._value;
        return products.filter((p) => ids.includes(p.productId));
      }),
      update: jest.fn(async (criteria: Partial<Product>, patch: Partial<Product>) => {
        const p = products.find((x) => x.productId === criteria.productId);
        if (p) Object.assign(p, patch);
        return { affected: p ? 1 : 0 };
      }),
      createQueryBuilder: jest.fn(() => {
        const qb: Record<string, unknown> = {};
        const chain = () => qb;
        qb.where = jest.fn(chain);
        qb.andWhere = jest.fn(chain);
        qb.orderBy = jest.fn(chain);
        qb.skip = jest.fn(chain);
        qb.take = jest.fn(chain);
        qb.getManyAndCount = jest.fn(async () => [products, products.length] as [Product[], number]);
        return qb;
      }),
    } as unknown as jest.Mocked<Repository<Product>>;

    skuRepo = {
      find: jest.fn(async () => skus),
    } as unknown as jest.Mocked<Repository<ProductSku>>;

    promoRepo = {
      find: jest.fn(async () => promos.filter((p) => p.status === 'active')),
    } as unknown as jest.Mocked<Repository<MerchantPromotion>>;

    const txProductRepo = {
      create: (dto: Partial<Product>) => dto as Product,
      save: async (p: Product) => {
        const saved = { ...p, productId: String(nextProductId++) };
        products.push(saved);
        return saved;
      },
    };
    const txSkuRepo = {
      insert: async (s: Partial<ProductSku>) => {
        skus.push(s as ProductSku);
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

    svc = new ProductService(
      storeRepo,
      catRepo,
      productRepo,
      skuRepo,
      promoRepo,
      dataSource as unknown as DataSource,
      bus,
    );
  });

  it('listCategories:返回本店分类', async () => {
    const r = await svc.listCategories('1');
    expect(r).toHaveLength(1);
    expect(r[0]!.name).toBe('主食');
  });

  it('createCategory + delete 空分类', async () => {
    const c = await svc.createCategory('1', { name: '饮料' });
    expect(c.categoryId).toBe('2');
    await svc.deleteCategory('1', c.categoryId);
    expect(cats.find((x) => x.categoryId === c.categoryId)).toBeUndefined();
  });

  it('删除有商品的分类 → STATUS_INVALID', async () => {
    products.push({ productId: '999', categoryId: '1', storeId: '201' } as Product);
    await expect(svc.deleteCategory('1', '1')).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('createProduct 无 SKU → 直接 product.price/stock + 发 ProductCreated', async () => {
    const r = await svc.createProduct('1', {
      categoryId: '1',
      name: '炒面',
      hasSku: 0,
      price: 1500,
      stock: 50,
      saleStatus: 'draft',
    });
    expect(r.productId).toBe('100');
    expect(products[0]!.price).toBe('1500');
    expect(products[0]!.stock).toBe(50);
    expect(publishedEvents.find((e) => e.name === EventName.ProductCreated)).toBeTruthy();
    expect(publishedEvents.find((e) => e.name === EventName.ProductOnSale)).toBeFalsy(); // draft 不发 on-sale
  });

  it('createProduct 多 SKU → product.price=MIN, stock=SUM + 发 ProductOnSale(on_shelf)', async () => {
    const r = await svc.createProduct('1', {
      categoryId: '1',
      name: '汉堡',
      hasSku: 1,
      saleStatus: 'on_shelf',
      skus: [
        { specValue: '小', price: 1500, stock: 30 },
        { specValue: '大', price: 2500, stock: 20 },
      ],
    });
    expect(r.saleStatus).toBe('on_shelf');
    expect(products[0]!.price).toBe('1500'); // MIN
    expect(products[0]!.stock).toBe(50); // SUM
    expect(skus).toHaveLength(2);
    expect(publishedEvents.find((e) => e.name === EventName.ProductOnSale)).toBeTruthy();
  });

  it('createProduct hasSku=1 但无 skus → INVALID_PARAM', async () => {
    await expect(svc.createProduct('1', { categoryId: '1', name: 'X', hasSku: 1 })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('createProduct 跨店铺 categoryId → STATUS_INVALID', async () => {
    cats.push({ categoryId: '99', storeId: '999', name: '别店分类', displayOrder: 0 } as ProductCategory);
    await expect(
      svc.createProduct('1', { categoryId: '99', name: 'X', hasSku: 0, price: 1, stock: 1 }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('updateProduct 在 active promo 中改 price → STATUS_INVALID', async () => {
    products.push({
      productId: '500',
      storeId: '201',
      categoryId: '1',
      saleStatus: 'on_shelf',
      price: '1000',
    } as Product);
    promos.push({
      promoId: '1',
      storeId: '201',
      promoType: 'time_limited',
      productIds: ['500'],
      status: 'active',
      startTime: '0',
      endTime: String(Date.now() + 3600_000),
    } as MerchantPromotion);
    await expect(svc.updateProduct('1', '500', { price: 800 })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('updateProduct:非 promo 期改 name 成功', async () => {
    products.push({
      productId: '600',
      storeId: '201',
      categoryId: '1',
      saleStatus: 'on_shelf',
      price: '1000',
    } as Product);
    const r = await svc.updateProduct('1', '600', { name: '新名' });
    expect(r.productId).toBe('600');
    expect(products[products.length - 1]!.name).toBe('新名');
  });

  it('setSaleStatus 跨商家 → FORBIDDEN', async () => {
    products.push({
      productId: '700',
      storeId: '202', // 别人的店
      categoryId: '1',
      saleStatus: 'on_shelf',
      price: '1000',
    } as Product);
    await expect(svc.setSaleStatus('1', '700', { saleStatus: 'off_shelf' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('setSaleStatus 同状态 → 不发事件', async () => {
    products.push({
      productId: '800',
      storeId: '201',
      categoryId: '1',
      saleStatus: 'off_shelf',
      price: '1000',
      updatedAt: '0',
    } as Product);
    await svc.setSaleStatus('1', '800', { saleStatus: 'off_shelf' });
    expect(publishedEvents).toHaveLength(0);
  });

  it('product 不存在 → NotFound', async () => {
    await expect(svc.getProductDetail('1', '999')).rejects.toBeInstanceOf(NotFoundException);
  });
});
