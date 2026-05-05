import type { AuditLogService } from '../../modules/audit-log/audit-log.service';
import type { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';

import { FoodOrderCancelledSubscriber } from './food-order-cancelled.subscriber';
import { FoodOrderCreatedSubscriber } from './food-order-created.subscriber';
import { FoodOrderPaidSubscriber } from './food-order-paid.subscriber';
import { FoodReviewCreatedSubscriber } from './food-review-created.subscriber';
import { PaymentSucceededSubscriber } from './payment-succeeded.subscriber';
import { StockReleasedSubscriber } from './stock-released.subscriber';

const fakeAudit = (): jest.Mocked<AuditLogService> =>
  ({
    writeAudit: jest.fn(async () => undefined),
  }) as unknown as jest.Mocked<AuditLogService>;

const fakeGateway = (): jest.Mocked<IntegrationGatewayService> =>
  ({
    getui: { pushOne: jest.fn(async () => ({ taskId: 't1' })) },
    sms: { send: jest.fn(async () => ({ providerRequestId: 'r1' })) },
  }) as unknown as jest.Mocked<IntegrationGatewayService>;

describe('Stage 5 subscribers', () => {
  it('FoodOrderCreatedSubscriber → audit_log 写入 WAIT_PAY', async () => {
    const audit = fakeAudit();
    const sub = new FoodOrderCreatedSubscriber(audit);
    await sub.handle({
      orderId: '700001',
      orderNo: '20260506000001',
      customerId: '10001',
      storeId: '20001',
      payableAmount: '5900',
      expireAt: 0,
      createdAt: 0,
    });
    expect(audit.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'food-order', afterStatus: 'WAIT_PAY' }),
    );
  });

  it('FoodOrderCreatedSubscriber → operatorType=customer', async () => {
    const audit = fakeAudit();
    const sub = new FoodOrderCreatedSubscriber(audit);
    await sub.handle({
      orderId: '1',
      orderNo: '1',
      customerId: '10001',
      storeId: '1',
      payableAmount: '0',
      expireAt: 0,
      createdAt: 0,
    });
    expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ operatorType: 'customer' }));
  });

  it('PaymentSucceededSubscriber → audit_log 写 success', async () => {
    const audit = fakeAudit();
    const sub = new PaymentSucceededSubscriber(audit);
    await sub.handle({
      payOrderId: '800001',
      payOrderNo: 'P1',
      bizType: 'FOOD',
      bizId: '700001',
      payChannel: 'wxpay',
      paidAmount: '5900',
      paidAt: 0,
    });
    expect(audit.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'payment-order', afterStatus: 'success' }),
    );
  });

  it('PaymentSucceededSubscriber → operatorType=system', async () => {
    const audit = fakeAudit();
    const sub = new PaymentSucceededSubscriber(audit);
    await sub.handle({
      payOrderId: '1',
      payOrderNo: '1',
      bizType: 'FOOD',
      bizId: '1',
      payChannel: 'alipay',
      paidAmount: '0',
      paidAt: 0,
    });
    expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ operatorType: 'system' }));
  });

  it('FoodOrderPaidSubscriber → getui pushOne 商家 + sms 用户', async () => {
    const audit = fakeAudit();
    const gateway = fakeGateway();
    const sub = new FoodOrderPaidSubscriber(audit, gateway);
    await sub.handle({
      orderId: '700001',
      customerId: '10001',
      storeId: '20001',
      paidAmount: '5900',
      paidAt: 0,
    });
    expect(gateway.getui.pushOne).toHaveBeenCalledWith(
      expect.objectContaining({ cid: 'merchant:20001', title: '新订单' }),
    );
    expect(gateway.sms.send).toHaveBeenCalledWith('10001', 'ORDER_PAID', '700001');
    expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ afterStatus: 'PAID_WAIT_MERCHANT' }));
  });

  it('FoodOrderPaidSubscriber → getui 失败仍 audit_log(non-blocking)', async () => {
    const audit = fakeAudit();
    const gateway = fakeGateway();
    (gateway.getui.pushOne as jest.Mock).mockRejectedValueOnce(new Error('upstream'));
    const sub = new FoodOrderPaidSubscriber(audit, gateway);
    await sub.handle({
      orderId: '700001',
      customerId: '10001',
      storeId: '20001',
      paidAmount: '5900',
      paidAt: 0,
    });
    expect(audit.writeAudit).toHaveBeenCalled();
  });

  it('FoodOrderCancelledSubscriber 客户取消 → operatorType=customer', async () => {
    const audit = fakeAudit();
    const gateway = fakeGateway();
    const sub = new FoodOrderCancelledSubscriber(audit, gateway);
    await sub.handle({
      orderId: '700001',
      customerId: '10001',
      reason: 'CUSTOMER_CANCEL',
      cancelledBy: 'customer',
      cancelledAt: 0,
    });
    expect(audit.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ operatorType: 'customer', afterStatus: 'CANCELLED' }),
    );
  });

  it('FoodOrderCancelledSubscriber 系统取消 → mock refund log + sms', async () => {
    const audit = fakeAudit();
    const gateway = fakeGateway();
    const sub = new FoodOrderCancelledSubscriber(audit, gateway);
    await sub.handle({
      orderId: '700001',
      customerId: '10001',
      reason: 'WAIT_PAY_TIMEOUT',
      cancelledBy: 'system',
      cancelledAt: 0,
    });
    expect(gateway.sms.send).toHaveBeenCalledWith('10001', 'ORDER_CANCELLED', '700001');
    expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ operatorType: 'system' }));
  });

  it('StockReleasedSubscriber → audit_log released', async () => {
    const audit = fakeAudit();
    const sub = new StockReleasedSubscriber(audit);
    await sub.handle({
      orderId: '700001',
      items: [
        { skuId: '9011', quantity: 2 },
        { skuId: '9012', quantity: 1 },
      ],
      reason: 'CUSTOMER_CANCEL',
      releasedAt: 0,
    });
    expect(audit.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'stock-lock',
        afterStatus: 'released',
        summary: expect.stringContaining('共 3 件'),
      }),
    );
  });

  it('StockReleasedSubscriber 空 items → 仍 audit_log', async () => {
    const audit = fakeAudit();
    const sub = new StockReleasedSubscriber(audit);
    await sub.handle({ orderId: '1', items: [], reason: 'X', releasedAt: 0 });
    expect(audit.writeAudit).toHaveBeenCalled();
  });

  it('FoodReviewCreatedSubscriber → audit_log food-review', async () => {
    const audit = fakeAudit();
    const sub = new FoodReviewCreatedSubscriber(audit);
    await sub.handle({
      reviewId: '800001',
      orderId: '700001',
      customerId: '10001',
      storeId: '20001',
      rating: 5,
      createdAt: 0,
    });
    expect(audit.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'food-review', summary: expect.stringContaining('5 星') }),
    );
  });

  it('FoodReviewCreatedSubscriber rating=1 → summary 含 1 星', async () => {
    const audit = fakeAudit();
    const sub = new FoodReviewCreatedSubscriber(audit);
    await sub.handle({
      reviewId: '800002',
      orderId: '700002',
      customerId: '10001',
      storeId: '20001',
      rating: 1,
      createdAt: 0,
    });
    expect(audit.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ summary: expect.stringContaining('1 星') }),
    );
  });
});
