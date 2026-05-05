import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { MerchantPromotion, Store } from '../../database/entities';

import { MerchantPromotionService } from './merchant-promotion.service';

describe('MerchantPromotionService', () => {
  let svc: MerchantPromotionService;
  let promos: MerchantPromotion[];
  let stores: Store[];
  let nextId = 1;

  let promoRepo: jest.Mocked<Repository<MerchantPromotion>>;
  let storeRepo: jest.Mocked<Repository<Store>>;

  beforeEach(() => {
    promos = [];
    stores = [{ storeId: '201', merchantId: '1' } as Store, { storeId: '202', merchantId: '2' } as Store];
    nextId = 1;

    promoRepo = {
      find: jest.fn(async (opts: { where?: Record<string, unknown> }) => {
        const where = opts.where ?? {};
        const wantStoreId = where.storeId as string | undefined;
        const wantStatus = where.status;
        let result = promos;
        if (wantStoreId) result = result.filter((p) => p.storeId === wantStoreId);
        if (wantStatus && typeof wantStatus === 'object' && '_value' in (wantStatus as object)) {
          const statuses = (wantStatus as { _value: string[] })._value;
          result = result.filter((p) => statuses.includes(p.status));
        } else if (typeof wantStatus === 'string') {
          result = result.filter((p) => p.status === wantStatus);
        }
        return result;
      }),
      findOne: jest.fn(
        async ({ where }: { where: Partial<MerchantPromotion> }) =>
          promos.find((p) => p.promoId === where.promoId) ?? null,
      ),
      create: jest.fn((dto: Partial<MerchantPromotion>) => dto as MerchantPromotion),
      save: jest.fn(async (p: MerchantPromotion) => {
        const saved = { ...p, promoId: String(nextId++) };
        promos.push(saved);
        return saved;
      }),
      update: jest.fn(async (criteria: Partial<MerchantPromotion>, patch: Partial<MerchantPromotion>) => {
        const p = promos.find((x) => x.promoId === criteria.promoId);
        if (p) Object.assign(p, patch);
        return { affected: p ? 1 : 0 };
      }),
    } as unknown as jest.Mocked<Repository<MerchantPromotion>>;

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

    svc = new MerchantPromotionService(promoRepo, storeRepo);
  });

  it('创建限时折扣:productIds 不冲突 → success', async () => {
    const r = await svc.create('1', {
      promoType: 'time_limited',
      name: '周末特惠',
      productIds: ['100', '200'],
      rules: { discountType: 'percent', discountValue: 80 },
      startTime: Date.now() + 60_000,
      endTime: Date.now() + 3600_000,
    });
    expect(r.promoId).toBe('1');
    expect(r.status).toBe('draft');
  });

  it('创建满减:多档位', async () => {
    const r = await svc.create('1', {
      promoType: 'single_full_off',
      name: '满减促销',
      productIds: ['300'],
      rules: {
        tiers: [
          { minAmount: 5000, offAmount: 500 },
          { minAmount: 10000, offAmount: 1500 },
        ],
      },
      startTime: Date.now() + 60_000,
      endTime: Date.now() + 3600_000,
    });
    expect(r.promoId).toBe('1');
  });

  it('startTime ≥ endTime → INVALID', async () => {
    await expect(
      svc.create('1', {
        promoType: 'time_limited',
        name: 'bad',
        productIds: ['1'],
        rules: { discountType: 'percent', discountValue: 80 },
        startTime: Date.now() + 100_000,
        endTime: Date.now() + 50_000,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('productIds 与现有 active 重叠 → STATUS_INVALID', async () => {
    promos.push({
      promoId: '99',
      storeId: '201',
      promoType: 'time_limited',
      name: '已存在',
      productIds: ['100'],
      status: 'active',
      startTime: '0',
      endTime: String(Date.now() + 3600_000),
      rules: { discountType: 'percent', discountValue: 90 },
    } as MerchantPromotion);
    await expect(
      svc.create('1', {
        promoType: 'time_limited',
        name: '冲突',
        productIds: ['100', '200'],
        rules: { discountType: 'percent', discountValue: 80 },
        startTime: Date.now() + 60_000,
        endTime: Date.now() + 3600_000,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('setStatus:draft → scheduled', async () => {
    promos.push({
      promoId: '5',
      storeId: '201',
      status: 'draft',
      productIds: [],
    } as unknown as MerchantPromotion);
    const r = await svc.setStatus('1', '5', { status: 'scheduled' });
    expect(r.status).toBe('scheduled');
  });

  it('setStatus:ended 不可再转换 → STATUS_INVALID', async () => {
    promos.push({ promoId: '6', storeId: '201', status: 'ended', productIds: [] } as unknown as MerchantPromotion);
    await expect(svc.setStatus('1', '6', { status: 'active' })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('setStatus 跨商家 → FORBIDDEN', async () => {
    promos.push({ promoId: '7', storeId: '202', status: 'draft', productIds: [] } as unknown as MerchantPromotion);
    await expect(svc.setStatus('1', '7', { status: 'scheduled' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('promo 不存在 → NotFound', async () => {
    await expect(svc.setStatus('1', '999', { status: 'scheduled' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
