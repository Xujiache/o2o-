import { EventName, type EventPayloadMap } from './events';

describe('Stage 6 EventName 扩展', () => {
  it('6 个 stage 6 事件命名按 domain.<biz>.<verb> 风格', () => {
    const stage6 = [
      EventName.ErrandQuoteCreated,
      EventName.ErrandOrderCreated,
      EventName.ErrandPaid,
      EventName.ErrandPriceIncreased,
      EventName.ErrandNoRiderCancelled,
      EventName.ErrandRemarkAdded,
    ];
    expect(stage6).toEqual([
      'domain.errand-quote.created',
      'domain.errand-order.created',
      'domain.errand-order.paid',
      'domain.errand-order.price-increased',
      'domain.errand-order.no-rider-cancelled',
      'domain.errand-order.remark-added',
    ]);
    for (const e of stage6) expect(e.startsWith('domain.')).toBe(true);
  });

  it('EventPayloadMap 6 个 key 编译期对齐(类型层面冒烟)', () => {
    const sample: Pick<
      EventPayloadMap,
      | typeof EventName.ErrandQuoteCreated
      | typeof EventName.ErrandOrderCreated
      | typeof EventName.ErrandPaid
      | typeof EventName.ErrandPriceIncreased
      | typeof EventName.ErrandNoRiderCancelled
      | typeof EventName.ErrandRemarkAdded
    > = {
      [EventName.ErrandQuoteCreated]: {
        quoteId: '600001',
        customerId: '10001',
        typeCode: 'BUY',
        payableAmount: '1500',
        expireAt: 1714868000000,
        createdAt: 1714867700000,
      },
      [EventName.ErrandOrderCreated]: {
        orderId: '610001',
        orderNo: 'E20260506000001',
        customerId: '10001',
        typeCode: 'BUY',
        payableAmount: '1500',
        expireAt: 1714868600000,
        createdAt: 1714867700000,
      },
      [EventName.ErrandPaid]: {
        orderId: '610001',
        customerId: '10001',
        paidAmount: '1500',
        paidAt: 1714867800000,
      },
      [EventName.ErrandPriceIncreased]: {
        orderId: '610001',
        customerId: '10001',
        oldUrgentLevel: 'standard',
        newUrgentLevel: 'fast',
        oldPayable: '1000',
        newPayable: '1500',
        source: 'customer',
        changedAt: 1714867900000,
      },
      [EventName.ErrandNoRiderCancelled]: {
        orderId: '610001',
        customerId: '10001',
        payOrderId: '700001',
        refundAmount: '1500',
        cancelledAt: 1714868400000,
      },
      [EventName.ErrandRemarkAdded]: {
        orderId: '610001',
        customerId: '10001',
        remark: '请按门铃',
        attachmentCount: 0,
        addedAt: 1714867950000,
      },
    };
    expect(Object.keys(sample)).toHaveLength(6);
  });

  it('Object.values(EventName) 总计 55(stage 5 末 33 + stage 6 +6 + stage 7 +9 + stage 8 +7)', () => {
    expect(Object.values(EventName).length).toBeGreaterThanOrEqual(55);
  });
});
