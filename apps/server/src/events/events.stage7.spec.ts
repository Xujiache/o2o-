import { EventName, type EventPayloadMap } from './events';

describe('Stage 7 EventName 扩展', () => {
  it('9 个 stage 7 事件命名按 domain.<biz>.<verb> 风格', () => {
    const stage7 = [
      EventName.MerchantOrderPushed,
      EventName.MerchantOrderAccepted,
      EventName.MerchantOrderRejected,
      EventName.FoodReadyForPickup,
      EventName.AfterSaleApplied,
      EventName.AfterSaleReviewedByMerchant,
      EventName.OrderReviewSubmitted,
      EventName.MerchantSettlementGenerated,
      EventName.MerchantWithdrawRequested,
    ];
    expect(stage7).toEqual([
      'domain.merchant-order.pushed',
      'domain.merchant-order.accepted',
      'domain.merchant-order.rejected',
      'domain.food-order.ready-for-pickup',
      'domain.after-sale.applied',
      'domain.after-sale.reviewed-by-merchant',
      'domain.order-review.submitted',
      'domain.merchant-settlement.generated',
      'domain.merchant-withdrawal.requested',
    ]);
    for (const e of stage7) expect(e.startsWith('domain.')).toBe(true);
  });

  it('EventPayloadMap 9 个 key 编译期对齐', () => {
    const sample: Pick<
      EventPayloadMap,
      | typeof EventName.MerchantOrderPushed
      | typeof EventName.MerchantOrderAccepted
      | typeof EventName.MerchantOrderRejected
      | typeof EventName.FoodReadyForPickup
      | typeof EventName.AfterSaleApplied
      | typeof EventName.AfterSaleReviewedByMerchant
      | typeof EventName.OrderReviewSubmitted
      | typeof EventName.MerchantSettlementGenerated
      | typeof EventName.MerchantWithdrawRequested
    > = {
      [EventName.MerchantOrderPushed]: {
        orderId: '510001',
        storeId: '20001',
        merchantId: '30001',
        payableAmountCents: '5000',
        pushedAt: 1715472600000,
      },
      [EventName.MerchantOrderAccepted]: {
        orderId: '510001',
        storeId: '20001',
        merchantId: '30001',
        expectedReadyAt: 1715473500000,
        acceptedAt: 1715472700000,
      },
      [EventName.MerchantOrderRejected]: {
        orderId: '510001',
        storeId: '20001',
        merchantId: '30001',
        rejectReason: '商品已售罄',
        rejectedAt: 1715472700000,
      },
      [EventName.FoodReadyForPickup]: {
        orderId: '510001',
        storeId: '20001',
        merchantId: '30001',
        readyAt: 1715473800000,
      },
      [EventName.AfterSaleApplied]: {
        afterSaleId: '700001',
        orderId: '510001',
        storeId: '20001',
        merchantId: '30001',
        customerId: '10001',
        amountCents: '5000',
        reason: '送错餐',
        appliedAt: 1715476200000,
      },
      [EventName.AfterSaleReviewedByMerchant]: {
        afterSaleId: '700001',
        orderId: '510001',
        storeId: '20001',
        decision: 'APPROVE',
        rejectReason: null,
        reviewedAt: 1715476500000,
      },
      [EventName.OrderReviewSubmitted]: {
        reviewId: '800001',
        orderId: '510001',
        storeId: '20001',
        merchantId: '30001',
        customerId: '10001',
        rating: 5,
        submittedAt: 1715476600000,
      },
      [EventName.MerchantSettlementGenerated]: {
        settlementId: '900001',
        storeId: '20001',
        merchantId: '30001',
        periodStart: 1715385600000,
        periodEnd: 1715471999999,
        netCents: '15000',
        generatedAt: 1715479200000,
      },
      [EventName.MerchantWithdrawRequested]: {
        withdrawalId: 'A00001',
        storeId: '20001',
        merchantId: '30001',
        amountCents: '10000',
        requestedAt: 1715480000000,
      },
    };
    expect(Object.keys(sample)).toHaveLength(9);
  });

  it('Object.values(EventName) 总计 55(stage 6 末 39 + stage 7 +9 + stage 8 +7)', () => {
    expect(Object.values(EventName).length).toBeGreaterThanOrEqual(55);
  });
});
