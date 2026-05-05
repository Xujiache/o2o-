import { EventName } from './events';

describe('Stage 2 EventName 扩展', () => {
  it('6 个 stage 2 事件全部以 domain.{merchant,store,product,stock}. 前缀', () => {
    const stage2 = [
      EventName.MerchantSubmitted,
      EventName.MerchantApproved,
      EventName.StoreStatusChanged,
      EventName.ProductCreated,
      EventName.ProductOnSale,
      EventName.StockLow,
    ];
    expect(stage2).toEqual([
      'domain.merchant.submitted',
      'domain.merchant.approved',
      'domain.store.status-changed',
      'domain.product.created',
      'domain.product.on-sale',
      'domain.stock.low',
    ]);
    for (const e of stage2) expect(e.startsWith('domain.')).toBe(true);
  });

  it('Object.values(EventName) 共 21 个(stage 0 五 + stage 1 五 + stage 2 六 + stage 3 五)', () => {
    expect(Object.values(EventName)).toHaveLength(21);
  });
});
