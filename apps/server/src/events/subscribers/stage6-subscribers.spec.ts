import type { Repository } from 'typeorm';

import type { PaymentOrder } from '../../database/entities';
import type { AuditLogService } from '../../modules/audit-log/audit-log.service';
import type { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';

import { ErrandNoRiderCancelledSubscriber } from './errand-no-rider-cancelled.subscriber';
import { ErrandOrderCreatedSubscriber } from './errand-order-created.subscriber';
import { ErrandPriceIncreasedSubscriber } from './errand-price-increased.subscriber';
import { ErrandQuoteCreatedSubscriber } from './errand-quote-created.subscriber';
import { ErrandRemarkAddedSubscriber } from './errand-remark-added.subscriber';

const fakeAudit = (): jest.Mocked<AuditLogService> =>
  ({ writeAudit: jest.fn(async () => undefined) }) as unknown as jest.Mocked<AuditLogService>;

const fakeGateway = (): jest.Mocked<IntegrationGatewayService> =>
  ({
    getui: { pushOne: jest.fn(async () => ({ taskId: 't1' })) },
    sms: { send: jest.fn(async () => ({ providerRequestId: 'r1' })) },
  }) as unknown as jest.Mocked<IntegrationGatewayService>;

describe('Stage 6 subscribers', () => {
  it('ErrandQuoteCreated → audit_log', async () => {
    const audit = fakeAudit();
    const sub = new ErrandQuoteCreatedSubscriber(audit);
    await sub.handle({
      quoteId: 'q1',
      customerId: '10001',
      typeCode: 'BUY',
      payableAmount: '600',
      expireAt: 0,
      createdAt: 0,
    });
    expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ targetType: 'errand-quote' }));
  });

  it('ErrandOrderCreated → audit_log + WAIT_PAY', async () => {
    const audit = fakeAudit();
    const sub = new ErrandOrderCreatedSubscriber(audit);
    await sub.handle({
      orderId: '600001',
      orderNo: 'E20260506000001',
      customerId: '10001',
      typeCode: 'BUY',
      payableAmount: '600',
      expireAt: 0,
      createdAt: 0,
    });
    expect(audit.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'errand-order', afterStatus: 'WAIT_PAY' }),
    );
  });

  it('ErrandPriceIncreased → push 骑手 + audit', async () => {
    const audit = fakeAudit();
    const gw = fakeGateway();
    const sub = new ErrandPriceIncreasedSubscriber(audit, gw);
    await sub.handle({
      orderId: '600001',
      customerId: '10001',
      oldUrgentLevel: 'standard',
      newUrgentLevel: 'fast',
      oldPayable: '600',
      newPayable: '1100',
      source: 'customer',
      changedAt: 0,
    });
    expect(gw.getui.pushOne).toHaveBeenCalled();
    expect(audit.writeAudit).toHaveBeenCalled();
  });

  it('ErrandPriceIncreased push 失败不阻塞 audit', async () => {
    const audit = fakeAudit();
    const gw = fakeGateway();
    (gw.getui.pushOne as jest.Mock).mockRejectedValueOnce(new Error('x'));
    const sub = new ErrandPriceIncreasedSubscriber(audit, gw);
    await sub.handle({
      orderId: '600001',
      customerId: '10001',
      oldUrgentLevel: 'standard',
      newUrgentLevel: 'fast',
      oldPayable: '600',
      newPayable: '1100',
      source: 'customer',
      changedAt: 0,
    });
    expect(audit.writeAudit).toHaveBeenCalled();
  });

  it('ErrandRemarkAdded → push + audit', async () => {
    const audit = fakeAudit();
    const gw = fakeGateway();
    const sub = new ErrandRemarkAddedSubscriber(audit, gw);
    await sub.handle({
      orderId: '600001',
      customerId: '10001',
      remark: '请按门铃',
      attachmentCount: 0,
      addedAt: 0,
    });
    expect(gw.getui.pushOne).toHaveBeenCalled();
    expect(audit.writeAudit).toHaveBeenCalled();
  });

  it('ErrandNoRiderCancelled → payment refund + sms + audit', async () => {
    const audit = fakeAudit();
    const gw = fakeGateway();
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const payRepo: any = { update: jest.fn(async () => ({ affected: 1, raw: [] })) };
    const sub = new ErrandNoRiderCancelledSubscriber(payRepo as Repository<PaymentOrder>, audit, gw);
    /* eslint-enable @typescript-eslint/no-explicit-any */
    await sub.handle({
      orderId: '600001',
      customerId: '10001',
      payOrderId: '700001',
      refundAmount: '600',
      cancelledAt: 0,
    });
    expect(payRepo.update).toHaveBeenCalled();
    expect(gw.sms.send).toHaveBeenCalled();
    expect(audit.writeAudit).toHaveBeenCalled();
  });

  it('ErrandNoRiderCancelled payOrderId 为空时不调 refund', async () => {
    const audit = fakeAudit();
    const gw = fakeGateway();
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const payRepo: any = { update: jest.fn(async () => ({ affected: 1, raw: [] })) };
    const sub = new ErrandNoRiderCancelledSubscriber(payRepo as Repository<PaymentOrder>, audit, gw);
    /* eslint-enable @typescript-eslint/no-explicit-any */
    await sub.handle({
      orderId: '600001',
      customerId: '10001',
      payOrderId: null,
      refundAmount: '0',
      cancelledAt: 0,
    });
    expect(payRepo.update).not.toHaveBeenCalled();
  });
});
