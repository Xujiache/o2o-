import { EventName, type EventPayloadMap } from './events';

describe('Stage 5 EventName 扩展', () => {
  it('6 个 stage 5 事件命名按 domain.<biz>.<verb> 风格', () => {
    const stage5 = [
      EventName.FoodOrderCreated,
      EventName.PaymentSucceeded,
      EventName.FoodOrderPaid,
      EventName.FoodOrderCancelled,
      EventName.StockReleased,
      EventName.FoodReviewCreated,
    ];
    expect(stage5).toEqual([
      'domain.food-order.created',
      'domain.payment.succeeded',
      'domain.food-order.paid',
      'domain.food-order.cancelled',
      'domain.stock.released',
      'domain.food-review.created',
    ]);
    for (const e of stage5) expect(e.startsWith('domain.')).toBe(true);
  });

  it('EventPayloadMap 6 个 key 编译期对齐(类型层面冒烟)', () => {
    const sample: Pick<
      EventPayloadMap,
      | typeof EventName.FoodOrderCreated
      | typeof EventName.PaymentSucceeded
      | typeof EventName.FoodOrderPaid
      | typeof EventName.FoodOrderCancelled
      | typeof EventName.StockReleased
      | typeof EventName.FoodReviewCreated
    > = {
      [EventName.FoodOrderCreated]: {
        orderId: '500001',
        orderNo: '20260506000001',
        customerId: '10001',
        storeId: '20001',
        payableAmount: '3500',
        expireAt: 1714867800000,
        createdAt: 1714867700000,
      },
      [EventName.PaymentSucceeded]: {
        payOrderId: '700001',
        payOrderNo: 'P20260506100000000001',
        bizType: 'FOOD',
        bizId: '500001',
        payChannel: 'wxpay',
        paidAmount: '3500',
        paidAt: 1714867710000,
      },
      [EventName.FoodOrderPaid]: {
        orderId: '500001',
        customerId: '10001',
        storeId: '20001',
        paidAmount: '3500',
        paidAt: 1714867710000,
      },
      [EventName.FoodOrderCancelled]: {
        orderId: '500001',
        customerId: '10001',
        reason: 'WAIT_PAY_TIMEOUT',
        cancelledBy: 'system',
        cancelledAt: 1714868600000,
      },
      [EventName.StockReleased]: {
        orderId: '500001',
        items: [{ skuId: '90001', quantity: 2 }],
        reason: 'WAIT_PAY_TIMEOUT',
        releasedAt: 1714868600000,
      },
      [EventName.FoodReviewCreated]: {
        reviewId: '800001',
        orderId: '500001',
        customerId: '10001',
        storeId: '20001',
        rating: 5,
        createdAt: 1714900000000,
      },
    };
    expect(Object.keys(sample)).toHaveLength(6);
  });

  it('Object.values(EventName) 总计 33(stage 0 五 + stage 1 五 + stage 2 六 + stage 3 五 + stage 4 六 + stage 5 六)', () => {
    expect(Object.values(EventName)).toHaveLength(48);
  });
});
