import { EventName } from './events';

describe('Stage 10 EventName 检查(本阶段不新增 events)', () => {
  it('EventName 总数 ≥ 62(stage 9 末)', () => {
    expect(Object.keys(EventName).length).toBeGreaterThanOrEqual(62);
  });

  it('stage 10 是联调阶段,不引入新事件', () => {
    // 本阶段所有联调通过现有 PaymentSucceeded / FoodOrderPaid / ErrandPaid 等事件
    expect(EventName.PaymentSucceeded).toBe('domain.payment.succeeded');
    expect(EventName.FoodOrderPaid).toBe('domain.food-order.paid');
    expect(EventName.ErrandPaid).toBe('domain.errand-order.paid');
  });
});
