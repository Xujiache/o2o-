import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { FoodOrder, OrderReview, Store } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';

import { CustomerReviewService } from './customer-review.service';

interface World {
  reviews: OrderReview[];
  orders: FoodOrder[];
  stores: Store[];
  events: { name: string; payload: unknown }[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const reviewRepo: any = {
    findOne: jest.fn(async (opt: any) => w.reviews.find((r) => r.orderId === opt.where.orderId) ?? null),
    create: jest.fn((row: any) => row),
    save: jest.fn(async (row: any) => {
      const inserted = { ...row, orderReviewId: String(800000 + w.reviews.length + 1) };
      w.reviews.push(inserted);
      return inserted;
    }),
  };
  const orderRepo: any = {
    findOne: jest.fn(async (opt: any) => w.orders.find((o) => o.foodOrderId === opt.where.foodOrderId) ?? null),
  };
  const storeRepo: any = {
    findOne: jest.fn(async (opt: any) => w.stores.find((s) => s.storeId === opt.where.storeId) ?? null),
  };
  const eventBus = {
    publish: jest.fn(async (name: string, payload: unknown) => {
      w.events.push({ name, payload });
      return { eventId: 'e1' };
    }),
  } as unknown as DomainEventBus;

  const svc = new CustomerReviewService(reviewRepo, orderRepo, storeRepo, eventBus);
  return { svc };
  /* eslint-enable */
}

describe('CustomerReviewService', () => {
  let w: World;
  beforeEach(() => {
    w = {
      reviews: [],
      orders: [
        {
          foodOrderId: '510001',
          customerId: '10001',
          storeId: '20001',
          status: 'COMPLETED',
        } as FoodOrder,
      ],
      stores: [{ storeId: '20001', merchantId: '30001' } as Store],
      events: [],
    };
  });

  it('COMPLETED 订单可提交评价 + emit OrderReviewSubmitted', async () => {
    const { svc } = buildService(w);
    const r = await svc.submit('10001', { orderId: '510001', rating: 5, content: '好吃' });
    expect(r.reviewId).toBeTruthy();
    expect(w.reviews.length).toBe(1);
    expect(w.events[0]!.name).toBe('domain.order-review.submitted');
  });

  it('订单非 COMPLETED 抛 STATUS_INVALID', async () => {
    w.orders[0]!.status = 'DELIVERED';
    const { svc } = buildService(w);
    await expect(svc.submit('10001', { orderId: '510001', rating: 5 })).rejects.toThrow(UnprocessableEntityException);
  });

  it('订单不归属用户抛 FORBIDDEN', async () => {
    const { svc } = buildService(w);
    await expect(svc.submit('99999', { orderId: '510001', rating: 5 })).rejects.toThrow(ForbiddenException);
  });

  it('已评价过抛 DUPLICATE_REQUEST', async () => {
    w.reviews.push({ orderId: '510001' } as OrderReview);
    const { svc } = buildService(w);
    await expect(svc.submit('10001', { orderId: '510001', rating: 5 })).rejects.toThrow(BadRequestException);
  });

  it('订单不存在抛 NotFound', async () => {
    const { svc } = buildService(w);
    await expect(svc.submit('10001', { orderId: '999', rating: 5 })).rejects.toThrow(NotFoundException);
  });
});
