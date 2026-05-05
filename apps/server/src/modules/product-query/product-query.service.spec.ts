import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { MerchantPromotion, Product, ProductCategory, ProductSku, Store } from '../../database/entities';

import { ProductQueryService } from './product-query.service';

describe('ProductQueryService', () => {
  let svc: ProductQueryService;
  let stores: Store[];
  let products: Product[];
  let skus: ProductSku[];
  let categories: ProductCategory[];
  let promos: MerchantPromotion[];

  beforeEach(() => {
    stores = [
      { storeId: '20001', businessStatus: 'online' } as unknown as Store,
      { storeId: '20002', businessStatus: 'paused' } as unknown as Store,
    ];
    categories = [
      { categoryId: '301', storeId: '20001', name: '主食', displayOrder: 1 } as unknown as ProductCategory,
      { categoryId: '302', storeId: '20001', name: '小食', displayOrder: 2 } as unknown as ProductCategory,
      { categoryId: '303', storeId: '20001', name: '饮品', displayOrder: 0 } as unknown as ProductCategory,
    ];
    products = [
      {
        productId: '901',
        storeId: '20001',
        categoryId: '301',
        name: '汉堡套餐',
        description: '招牌',
        coverImageFileId: 'fid-burger',
        price: '2500',
        originalPrice: '3000',
        stock: 100,
        hasSku: 1,
        saleStatus: 'on_shelf',
      } as unknown as Product,
      {
        productId: '902',
        storeId: '20001',
        categoryId: '302',
        name: '薯条',
        description: null,
        coverImageFileId: null,
        price: '800',
        originalPrice: null,
        stock: 0,
        hasSku: 0,
        saleStatus: 'on_shelf',
      } as unknown as Product,
      {
        productId: '903',
        storeId: '20001',
        categoryId: '303',
        name: '已下架饮料',
        price: '500',
        stock: 50,
        hasSku: 0,
        saleStatus: 'off_shelf',
      } as unknown as Product,
    ];
    skus = [
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
        price: '2200',
        stock: 30,
        stockLocked: 30,
      } as unknown as ProductSku,
    ];
    promos = [
      {
        promoId: '7001',
        storeId: '20001',
        promoType: 'single_full_off',
        name: '满 30 减 5',
        productIds: ['901'],
        rules: { tiers: [{ minAmount: 3000, offAmount: 500 }] },
        status: 'active',
        startTime: String(Date.now() - 1000),
        endTime: String(Date.now() + 86400000),
      } as unknown as MerchantPromotion,
      {
        promoId: '7002',
        storeId: '20001',
        promoType: 'time_limited',
        name: '过期活动',
        productIds: ['902'],
        rules: { discountType: 'percent', discountValue: 80 },
        status: 'ended',
        startTime: '0',
        endTime: '0',
      } as unknown as MerchantPromotion,
    ];

    const storeRepo = {
      findOne: jest.fn(({ where }: { where: Partial<Store> }) =>
        Promise.resolve(stores.find((s) => s.storeId === where.storeId) ?? null),
      ),
    } as unknown as jest.Mocked<Repository<Store>>;

    const productRepo = {
      find: jest.fn(({ where }: { where: Partial<Product> }) =>
        Promise.resolve(products.filter((p) => p.storeId === where.storeId)),
      ),
    } as unknown as jest.Mocked<Repository<Product>>;

    const skuRepo = {
      createQueryBuilder: jest.fn(() => {
        const filters: { ids?: string[] } = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const qb: any = {};
        qb.where = jest.fn().mockImplementation((_sql: string, params?: { ids?: string[] }) => {
          if (params?.ids) filters.ids = params.ids;
          return qb;
        });
        qb.getMany = jest.fn().mockImplementation(async () => skus.filter((s) => filters.ids?.includes(s.productId)));
        return qb;
      }),
    } as unknown as jest.Mocked<Repository<ProductSku>>;

    const categoryRepo = {
      find: jest.fn(({ where }: { where: Partial<ProductCategory> }) =>
        Promise.resolve(categories.filter((c) => c.storeId === where.storeId)),
      ),
    } as unknown as jest.Mocked<Repository<ProductCategory>>;

    const promotionRepo = {
      find: jest.fn(({ where }: { where: Partial<MerchantPromotion> }) =>
        Promise.resolve(promos.filter((p) => p.storeId === where.storeId)),
      ),
    } as unknown as jest.Mocked<Repository<MerchantPromotion>>;

    svc = new ProductQueryService(storeRepo, productRepo, skuRepo, categoryRepo, promotionRepo);
  });

  it('成功:返 categories(按 displayOrder 排序)+ on_shelf products + skus + active promotions', async () => {
    const r = await svc.getProducts('20001');
    expect(r.storeId).toBe('20001');
    expect(r.categories.map((c) => c.name)).toEqual(['饮品', '主食', '小食']); // displayOrder 0,1,2
    expect(r.products).toHaveLength(2); // off_shelf 不返
    expect(r.products.find((p) => p.productId === '903')).toBeUndefined();
    expect(r.promotions).toHaveLength(1);
    expect(r.promotions[0]!.promoId).toBe('7001');
  });

  it('店铺不存在 → DATA_NOT_FOUND', async () => {
    await expect(svc.getProducts('99999')).rejects.toThrow(NotFoundException);
  });

  it('店铺非 online → STATUS_INVALID STORE_NOT_OPEN', async () => {
    await expect(svc.getProducts('20002')).rejects.toThrow(UnprocessableEntityException);
  });

  it('product 901 含两个 sku,availableStock = stock - stockLocked', async () => {
    const r = await svc.getProducts('20001');
    const p = r.products.find((x) => x.productId === '901')!;
    expect(p.skus).toHaveLength(2);
    const sku1 = p.skus.find((s) => s.skuId === '9011')!;
    const sku2 = p.skus.find((s) => s.skuId === '9012')!;
    expect(sku1.availableStock).toBe(40); // 50-10
    expect(sku2.availableStock).toBe(0); // 30-30
  });

  it('product 902 stock=0 + hasSku=0 → saleStatus 退化为 sold_out', async () => {
    const r = await svc.getProducts('20001');
    const p = r.products.find((x) => x.productId === '902')!;
    expect(p.saleStatus).toBe('sold_out');
  });

  it('product 901 hasSku=1 + 全 sku availableStock=0 时 → sold_out', async () => {
    skus[0]!.stockLocked = 50; // 全部锁定
    skus[1]!.stockLocked = 30;
    const r = await svc.getProducts('20001');
    const p = r.products.find((x) => x.productId === '901')!;
    expect(p.saleStatus).toBe('sold_out');
  });

  it('已 off_shelf 商品不返列表', async () => {
    const r = await svc.getProducts('20001');
    expect(r.products.every((p) => p.saleStatus !== 'off_shelf')).toBe(true);
  });

  it('已结束促销(status=ended 或时间窗外)→ 不返', async () => {
    const r = await svc.getProducts('20001');
    expect(r.promotions.find((p) => p.promoId === '7002')).toBeUndefined();
  });
});
