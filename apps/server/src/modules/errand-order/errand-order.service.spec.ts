import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import type {
  ErrandAttachment,
  ErrandOrder,
  ErrandOrderDetail,
  ErrandPriceSnapshot,
  ErrandQuote,
  ErrandTimeline,
  ErrandType,
} from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import type { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import type { ErrandPricingService } from '../errand-pricing/errand-pricing.service';
import type { ErrandTypeService } from '../errand-type/errand-type.service';
import type { PaymentService } from '../payment/payment.service';
import type { ProhibitedItemService, ProhibitedHit } from '../prohibited-item/prohibited-item.service';

import type { QuoteErrandDto, SubmitErrandDto } from './errand-order.dto';
import { ErrandOrderService } from './errand-order.service';

interface World {
  quotes: ErrandQuote[];
  orders: ErrandOrder[];
  details: ErrandOrderDetail[];
  attachments: ErrandAttachment[];
  snapshots: ErrandPriceSnapshot[];
  timelines: ErrandTimeline[];
  redisStore: Map<string, string>;
  events: { name: string; payload: unknown }[];
}

function makeWorld(): World {
  return {
    quotes: [],
    orders: [],
    details: [],
    attachments: [],
    snapshots: [],
    timelines: [],
    redisStore: new Map(),
    events: [],
  };
}

function buildService(
  w: World,
  opts: {
    type?: Partial<ErrandType>;
    rejectedKeyword?: string | null;
    distanceMeters?: number;
  } = {},
) {
  const typeFixture: ErrandType = {
    errandTypeId: '1',
    typeCode: 'BUY',
    name: '帮我买',
    requiredFields: ['pickupAddress', 'deliveryAddress', 'budget', 'itemDesc'],
    description: '',
    enabled: 1,
    sort: 1,
    createdAt: '0',
    updatedAt: '0',
    ...opts.type,
  } as ErrandType;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const quoteRepo: any = {
    findOne: jest.fn(async (q: any) => w.quotes.find((x) => x.errandQuoteId === q.where.errandQuoteId) ?? null),
    insert: jest.fn(async (data: any) => {
      const id = String(w.quotes.length + 1);
      w.quotes.push({ ...data, errandQuoteId: id } as ErrandQuote);
      return { identifiers: [{ errandQuoteId: id }], generatedMaps: [], raw: [] };
    }),
  };
  const orderRepo: any = {
    findOne: jest.fn(async () => null),
    insert: jest.fn(),
    update: jest.fn(async () => ({ affected: 1, raw: [] })),
  };
  const typeSvc = {
    findByCode: jest.fn(async () => typeFixture),
  } as unknown as jest.Mocked<ErrandTypeService>;
  const pricingSvc = {
    calc: jest.fn(async () => ({
      baseFee: '500',
      distanceFee: '100',
      urgentFee: '0',
      payableAmount: '600',
    })),
  } as unknown as jest.Mocked<ErrandPricingService>;
  const prohibitedHits: ProhibitedHit[] = opts.rejectedKeyword
    ? [{ keyword: opts.rejectedKeyword, category: 'x', level: 'REJECT', description: 'x' }]
    : [];
  const prohibitedSvc = {
    check: jest.fn(async () => prohibitedHits),
  } as unknown as jest.Mocked<ProhibitedItemService>;
  // hasReject 是静态方法,补 stub 同名
  (
    prohibitedSvc as unknown as { constructor: { hasReject: typeof ProhibitedItemService.hasReject } }
  ).constructor.hasReject = (hits: ProhibitedHit[]) => hits.some((h) => h.level === 'REJECT');
  const gateway = {
    amap: {
      distance: jest.fn(async () => opts.distanceMeters ?? 1500),
    },
  } as unknown as jest.Mocked<IntegrationGatewayService>;
  const paymentSvc = {
    prepay: jest.fn(async () => ({
      payOrderId: '700001',
      payOrderNo: 'P20260506000001',
      payParams: 'mock',
      expireAt: Date.now() + 600_000,
    })),
  } as unknown as jest.Mocked<PaymentService>;

  const eventBus = {
    publish: jest.fn(async (name: string, payload: unknown) => {
      w.events.push({ name, payload });
      return { eventId: 'evt' };
    }),
  } as unknown as jest.Mocked<DomainEventBus>;

  function emRepo(name: string): any {
    if (name === 'ErrandOrder') {
      return {
        insert: jest.fn(async (data: any) => {
          const id = String(w.orders.length + 1);
          w.orders.push({ ...data, errandOrderId: id } as ErrandOrder);
          return { identifiers: [{ errandOrderId: id }], generatedMaps: [], raw: [] };
        }),
      };
    }
    if (name === 'ErrandOrderDetail') {
      return {
        insert: jest.fn(async (data: any) => {
          w.details.push(data as ErrandOrderDetail);
          return { identifiers: [], generatedMaps: [], raw: [] };
        }),
      };
    }
    if (name === 'ErrandAttachment') {
      return {
        insert: jest.fn(async (data: any) => {
          w.attachments.push(data as ErrandAttachment);
          return { identifiers: [], generatedMaps: [], raw: [] };
        }),
      };
    }
    if (name === 'ErrandPriceSnapshot') {
      return {
        insert: jest.fn(async (data: any) => {
          w.snapshots.push(data as ErrandPriceSnapshot);
          return { identifiers: [], generatedMaps: [], raw: [] };
        }),
      };
    }
    if (name === 'ErrandTimeline') {
      return {
        insert: jest.fn(async (data: any) => {
          w.timelines.push(data as ErrandTimeline);
          return { identifiers: [], generatedMaps: [], raw: [] };
        }),
      };
    }
    if (name === 'ErrandQuote') {
      return {
        update: jest.fn(async (where: any, set: any) => {
          const q = w.quotes.find((x) => x.errandQuoteId === where.errandQuoteId);
          if (q) Object.assign(q, set);
          return { affected: 1, raw: [] };
        }),
      };
    }
    return {};
  }

  const emWrap = { getRepository: (entity: { name: string }) => emRepo(entity.name) };
  const dataSource: any = {
    transaction: jest.fn(async (cb: any) => cb(emWrap)),
  };

  const redis: any = {
    set: jest.fn(async (k: string, v: string) => {
      w.redisStore.set(k, v);
      return 'OK';
    }),
    incr: jest.fn(async (k: string) => {
      const cur = Number(w.redisStore.get(k) ?? '0') + 1;
      w.redisStore.set(k, String(cur));
      return cur;
    }),
    expire: jest.fn(async () => 1),
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const stub: any = { findOne: jest.fn(async () => null), find: jest.fn(async () => []), update: jest.fn() };
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return new ErrandOrderService(
    quoteRepo,
    orderRepo,
    stub,
    stub,
    stub,
    stub,
    typeSvc,
    pricingSvc,
    prohibitedSvc,
    gateway,
    paymentSvc,
    eventBus,
    dataSource,
    redis,
  );
}

const QUOTE_DTO_BUY: QuoteErrandDto = {
  typeCode: 'BUY',
  pickupAddress: { address: 'A', lng: 116.4074, lat: 39.9042 },
  deliveryAddress: { address: 'B', lng: 116.4192, lat: 39.9042 },
  weight: 0,
  urgentLevel: 'standard',
  budget: 5000,
  itemDesc: '一杯咖啡',
};

describe('ErrandOrderService.quote', () => {
  it('正常报价 + 写 errand_quote + Redis SETEX + 事件', async () => {
    const w = makeWorld();
    const svc = buildService(w);
    const r = await svc.quote('10001', QUOTE_DTO_BUY);
    expect(r.payableAmount).toBe('600');
    expect(r.distanceMeters).toBe(1500);
    expect(w.quotes).toHaveLength(1);
    expect(w.redisStore.size).toBeGreaterThanOrEqual(1);
    expect(w.events.find((e) => e.name === 'domain.errand-quote.created')).toBeDefined();
  });

  it('requiredFields 缺失 → INVALID_PARAM', async () => {
    const w = makeWorld();
    const svc = buildService(w, { type: { requiredFields: ['itemDesc', 'pickupAddress'] } });
    /* eslint-disable @typescript-eslint/no-explicit-any */
    await expect(svc.quote('10001', { ...QUOTE_DTO_BUY, itemDesc: undefined as any })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });

  it('违禁 REJECT 命中 → INVALID_PARAM', async () => {
    const w = makeWorld();
    const svc = buildService(w, { rejectedKeyword: '管制刀' });
    await expect(svc.quote('10001', QUOTE_DTO_BUY)).rejects.toBeInstanceOf(BadRequestException);
    expect(w.quotes).toHaveLength(0);
  });

  it('坐标缺失 → distance=0', async () => {
    const w = makeWorld();
    const svc = buildService(w);
    const r = await svc.quote('10001', {
      ...QUOTE_DTO_BUY,
      pickupAddress: { address: 'A' }, // 无 lng/lat
    });
    expect(r.distanceMeters).toBe(0);
  });

  it('快速档 prohibitedWarnings 数组 — 透传警告', async () => {
    const w = makeWorld();
    const svc = buildService(w);
    const r = await svc.quote('10001', QUOTE_DTO_BUY);
    expect(r.prohibitedWarnings).toEqual([]);
  });
});

describe('ErrandOrderService.submit', () => {
  function seedQuote(w: World, overrides: Partial<ErrandQuote> = {}): string {
    const id = String(w.quotes.length + 1);
    const now = Date.now();
    w.quotes.push({
      errandQuoteId: id,
      customerId: '10001',
      typeCode: 'BUY',
      pickupAddress: { address: 'A' },
      deliveryAddress: { address: 'B' },
      weight: null,
      urgentLevel: 'standard',
      budget: '5000',
      distanceMeters: 1500,
      baseFee: '500',
      distanceFee: '100',
      urgentFee: '0',
      payableAmount: '600',
      itemDesc: '咖啡',
      taskDesc: null,
      reservedTime: null,
      prohibitedWarnings: [],
      usedOrderId: null,
      expireAt: String(now + 5 * 60 * 1000),
      createdAt: String(now),
      ...overrides,
    } as ErrandQuote);
    return id;
  }

  const SUBMIT_DTO_BASE: Omit<SubmitErrandDto, 'quoteId'> = {
    payChannel: 'wxpay',
    remark: '尽快送达',
    attachments: ['8001'],
  };

  it('成功 → 5 张子表写入 + payment.prepay + 事件', async () => {
    const w = makeWorld();
    const svc = buildService(w);
    const quoteId = seedQuote(w);
    const r = await svc.submit('10001', { ...SUBMIT_DTO_BASE, quoteId });
    expect(r.status).toBe('WAIT_PAY');
    expect(r.orderNo.startsWith('E')).toBe(true);
    expect(r.payOrderId).toBe('700001');
    expect(w.orders).toHaveLength(1);
    expect(w.details).toHaveLength(1);
    expect(w.attachments).toHaveLength(1);
    expect(w.snapshots).toHaveLength(1);
    expect(w.timelines).toHaveLength(1);
    expect(w.timelines[0]!.eventType).toBe('CREATED');
    expect(w.events.find((e) => e.name === 'domain.errand-order.created')).toBeDefined();
  });

  it('quote 不存在 → DATA_NOT_FOUND', async () => {
    const w = makeWorld();
    const svc = buildService(w);
    await expect(svc.submit('10001', { ...SUBMIT_DTO_BASE, quoteId: 'xxx' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('quote 不属于本人 → DATA_NOT_FOUND', async () => {
    const w = makeWorld();
    const svc = buildService(w);
    const quoteId = seedQuote(w);
    await expect(svc.submit('10002', { ...SUBMIT_DTO_BASE, quoteId })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('quote 已过期 → STATUS_INVALID', async () => {
    const w = makeWorld();
    const svc = buildService(w);
    const quoteId = seedQuote(w, { expireAt: String(Date.now() - 1000) });
    await expect(svc.submit('10001', { ...SUBMIT_DTO_BASE, quoteId })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('quote 已使用 → DUPLICATE_REQUEST', async () => {
    const w = makeWorld();
    const svc = buildService(w);
    const quoteId = seedQuote(w, { usedOrderId: '600099' });
    await expect(svc.submit('10001', { ...SUBMIT_DTO_BASE, quoteId })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('无 attachments 时不插入', async () => {
    const w = makeWorld();
    const svc = buildService(w);
    const quoteId = seedQuote(w);
    await svc.submit('10001', { quoteId, payChannel: 'alipay' });
    expect(w.attachments).toHaveLength(0);
  });
});
