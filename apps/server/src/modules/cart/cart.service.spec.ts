import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { CartItem, Product, ProductSku, Store } from '../../database/entities';

import { CartService } from './cart.service';

describe('CartService', () => {
  let svc: CartService;
  let cartItems: CartItem[];
  let stores: Store[];
  let products: Product[];
  let skus: ProductSku[];

  beforeEach(() => {
    cartItems = [];
    stores = [
      { storeId: '20001', businessStatus: 'online', deliveryFee: '300' } as unknown as Store,
      { storeId: '20002', businessStatus: 'paused', deliveryFee: '0' } as unknown as Store,
    ];
    products = [
      { productId: '901', storeId: '20001', name: '汉堡', saleStatus: 'on_shelf' } as unknown as Product,
      { productId: '902', storeId: '20001', name: '已下架饮料', saleStatus: 'off_shelf' } as unknown as Product,
      { productId: '903', storeId: '20002', name: '其他店商品', saleStatus: 'on_shelf' } as unknown as Product,
    ];
    skus = [
      {
        skuId: '9011',
        productId: '901',
        specValue: '大份',
        price: '2800',
        stock: 50,
        stockLocked: 0,
      } as unknown as ProductSku,
      {
        skuId: '9012',
        productId: '901',
        specValue: '小份',
        price: '2200',
        stock: 30,
        stockLocked: 0,
      } as unknown as ProductSku,
      {
        skuId: '9020',
        productId: '902',
        specValue: '默认',
        price: '500',
        stock: 0,
        stockLocked: 0,
      } as unknown as ProductSku,
      {
        skuId: '9030',
        productId: '903',
        specValue: '默认',
        price: '1000',
        stock: 50,
        stockLocked: 0,
      } as unknown as ProductSku,
    ];

    let nextId = 1;
    const cartRepo = {
      findOne: jest.fn(({ where }: { where: Partial<CartItem> }) =>
        Promise.resolve(
          cartItems.find(
            (i) => i.customerId === where.customerId && i.storeId === where.storeId && i.skuId === where.skuId,
          ) ?? null,
        ),
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      find: jest.fn(({ where }: { where: any }) =>
        Promise.resolve(cartItems.filter((i) => i.customerId === where.customerId && i.storeId === where.storeId)),
      ),
      insert: jest.fn(async (rec: Partial<CartItem>) => {
        cartItems.push({ ...(rec as CartItem), cartItemId: String(nextId++) });
        return { identifiers: [], generatedMaps: [], raw: [] };
      }),
      update: jest.fn(async (criteria: Partial<CartItem>, patch: Partial<CartItem>) => {
        const idx = cartItems.findIndex((i) => i.cartItemId === criteria.cartItemId);
        if (idx >= 0) cartItems[idx] = { ...cartItems[idx]!, ...patch };
        return { affected: 1, raw: [] };
      }),
      delete: jest.fn(async (criteria: Partial<CartItem>) => {
        const before = cartItems.length;
        cartItems = cartItems.filter((i) => i.cartItemId !== criteria.cartItemId);
        return { affected: before - cartItems.length, raw: [] };
      }),
    } as unknown as jest.Mocked<Repository<CartItem>>;

    const storeRepo = {
      findOne: jest.fn(({ where }: { where: Partial<Store> }) =>
        Promise.resolve(stores.find((s) => s.storeId === where.storeId) ?? null),
      ),
    } as unknown as jest.Mocked<Repository<Store>>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchIn = (val: any, target: string): boolean => {
      if (!val) return true;
      if (typeof val === 'string') return val === target;
      const _value: string[] = (val as { _value?: string[] })._value ?? [];
      return _value.includes(target);
    };

    const productRepo = {
      findOne: jest.fn(({ where }: { where: Partial<Product> }) =>
        Promise.resolve(products.find((p) => p.productId === where.productId) ?? null),
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      find: jest.fn(({ where }: { where: any }) =>
        Promise.resolve(products.filter((p) => matchIn(where.productId, p.productId))),
      ),
    } as unknown as jest.Mocked<Repository<Product>>;

    const skuRepo = {
      findOne: jest.fn(({ where }: { where: Partial<ProductSku> }) =>
        Promise.resolve(skus.find((s) => s.skuId === where.skuId) ?? null),
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      find: jest.fn(({ where }: { where: any }) => Promise.resolve(skus.filter((s) => matchIn(where.skuId, s.skuId)))),
    } as unknown as jest.Mocked<Repository<ProductSku>>;

    svc = new CartService(cartRepo, storeRepo, productRepo, skuRepo);
  });

  it('quantity>0 → 新增 cart_item;返完整购物车 + goodsAmount', async () => {
    const r = await svc.upsertItem('10001', { storeId: '20001', skuId: '9011', quantity: 2 });
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.quantity).toBe(2);
    expect(r.items[0]!.subTotal).toBe('5600');
    expect(r.goodsAmount).toBe('5600');
    expect(r.deliveryFee).toBe('300');
    expect(r.totalAmount).toBe('5900');
  });

  it('已存在记录再 upsert 同 sku → UPDATE quantity', async () => {
    await svc.upsertItem('10001', { storeId: '20001', skuId: '9011', quantity: 1 });
    const r = await svc.upsertItem('10001', { storeId: '20001', skuId: '9011', quantity: 5 });
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.quantity).toBe(5);
  });

  it('quantity=0 → 删除该 sku 行', async () => {
    await svc.upsertItem('10001', { storeId: '20001', skuId: '9011', quantity: 2 });
    const r = await svc.upsertItem('10001', { storeId: '20001', skuId: '9011', quantity: 0 });
    expect(r.items).toHaveLength(0);
    expect(r.goodsAmount).toBe('0');
  });

  it('店铺不存在 → DATA_NOT_FOUND', async () => {
    await expect(svc.upsertItem('10001', { storeId: '99999', skuId: '9011', quantity: 1 })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('店铺非 online → STATUS_INVALID STORE_NOT_OPEN', async () => {
    await expect(svc.upsertItem('10001', { storeId: '20002', skuId: '9030', quantity: 1 })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('sku 不属于指定 storeId → STATUS_INVALID SKU_STORE_MISMATCH', async () => {
    // sku 9030 属于 store 20002,这里 storeId 写 20001 → 矛盾
    await expect(svc.upsertItem('10001', { storeId: '20001', skuId: '9030', quantity: 1 })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('product 已下架(off_shelf)→ STATUS_INVALID PRODUCT_NOT_ON_SHELF', async () => {
    await expect(svc.upsertItem('10001', { storeId: '20001', skuId: '9020', quantity: 1 })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('跨店并存:同用户不同 store 互不影响', async () => {
    stores[1]!.businessStatus = 'online'; // 临时打开
    await svc.upsertItem('10001', { storeId: '20001', skuId: '9011', quantity: 1 });
    await svc.upsertItem('10001', { storeId: '20002', skuId: '9030', quantity: 1 });
    const cartA = await svc.getCart('10001', '20001');
    const cartB = await svc.getCart('10001', '20002');
    expect(cartA.items).toHaveLength(1);
    expect(cartB.items).toHaveLength(1);
    expect(cartA.items[0]!.skuId).toBe('9011');
    expect(cartB.items[0]!.skuId).toBe('9030');
  });
});
