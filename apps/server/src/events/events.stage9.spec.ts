import { EventName, type EventPayloadMap } from './events';

describe('Stage 9 EventName 扩展', () => {
  it('7 个 stage 9 事件命名按 domain.<biz>.<verb> 风格', () => {
    const stage9 = [
      EventName.ManualDispatchCreated,
      EventName.OrderReassigned,
      EventName.ArbitrationCompleted,
      EventName.RefundExecuted,
      EventName.CouponPublished,
      EventName.RateRuleChanged,
      EventName.ReportGenerated,
    ];
    expect(stage9).toEqual([
      'domain.dispatch.manual-created',
      'domain.dispatch.order-reassigned',
      'domain.after-sale.arbitration-completed',
      'domain.refund.executed',
      'domain.coupon.published',
      'domain.rate-rule.changed',
      'domain.dashboard.report-generated',
    ]);
    for (const e of stage9) expect(e.startsWith('domain.')).toBe(true);
  });

  it('EventPayloadMap 7 个 key 编译期对齐', () => {
    const sample: Pick<
      EventPayloadMap,
      | typeof EventName.ManualDispatchCreated
      | typeof EventName.OrderReassigned
      | typeof EventName.ArbitrationCompleted
      | typeof EventName.RefundExecuted
      | typeof EventName.CouponPublished
      | typeof EventName.RateRuleChanged
      | typeof EventName.ReportGenerated
    > = {
      [EventName.ManualDispatchCreated]: {
        dispatchTaskId: 'D1',
        riderId: 'R1',
        operatorAdminId: '1',
        reason: 'rebalance',
        createdAt: 1,
      },
      [EventName.OrderReassigned]: {
        dispatchTaskId: 'D1',
        oldRiderId: 'R0',
        newRiderId: 'R1',
        operatorAdminId: '1',
        reassignedAt: 1,
      },
      [EventName.ArbitrationCompleted]: {
        arbitrationId: 'A1',
        afterSaleId: 'AS1',
        responsibleParty: 'MERCHANT',
        decision: 'APPROVE',
        refundAmount: '1000',
        penalty: '0',
        refundOrderId: 'RF1',
        operatorAdminId: '1',
        completedAt: 1,
      },
      [EventName.RefundExecuted]: {
        refundOrderId: 'RF1',
        refundNo: 'RF20260506001',
        bizType: 'FOOD',
        bizOrderId: '510001',
        amount: '1000',
        status: 'SUCCESS',
        executedAt: 1,
      },
      [EventName.CouponPublished]: {
        couponRuleId: 'C1',
        couponName: '满 50 减 10',
        bizType: 'FOOD',
        totalStock: 100,
        validFrom: 1,
        validTo: 2,
        publishedAt: 1,
      },
      [EventName.RateRuleChanged]: {
        rateRuleId: 'RR1',
        cityCode: 'BJ',
        categoryId: null,
        effectiveAt: 1,
        operatorAdminId: '1',
        changedAt: 1,
      },
      [EventName.ReportGenerated]: {
        snapshotDate: '2026-05-06',
        cityCode: 'BJ',
        generatedAt: 1,
      },
    };
    expect(Object.keys(sample)).toHaveLength(7);
  });

  it('全 EventName 累计 62 个(stage 8 末 55 + 7)', () => {
    expect(Object.keys(EventName)).toHaveLength(62);
  });
});
