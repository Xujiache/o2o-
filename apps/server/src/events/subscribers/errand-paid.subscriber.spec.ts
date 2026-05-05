import type { AuditLogService } from '../../modules/audit-log/audit-log.service';
import type { ErrandDispatchService } from '../../modules/errand-dispatch/errand-dispatch.service';
import type { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';

import { ErrandPaidSubscriber } from './errand-paid.subscriber';

const fakeAudit = (): jest.Mocked<AuditLogService> =>
  ({ writeAudit: jest.fn(async () => undefined) }) as unknown as jest.Mocked<AuditLogService>;

const fakeGateway = (): jest.Mocked<IntegrationGatewayService> =>
  ({
    getui: { pushOne: jest.fn(async () => ({ taskId: 't1' })) },
    sms: { send: jest.fn(async () => ({ providerRequestId: 'r1' })) },
  }) as unknown as jest.Mocked<IntegrationGatewayService>;

const fakeDispatch = (fail = false): jest.Mocked<ErrandDispatchService> =>
  ({
    createTask: jest.fn(async () => {
      if (fail) throw new Error('dispatch failed');
      /* eslint-disable @typescript-eslint/no-explicit-any */
      return {} as any;
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }),
  }) as unknown as jest.Mocked<ErrandDispatchService>;

describe('ErrandPaidSubscriber', () => {
  const PAYLOAD = {
    orderId: '600001',
    customerId: '10001',
    paidAmount: '1500',
    paidAt: 1714867800000,
  };

  it('正常路径:dispatch + push + sms + audit', async () => {
    const audit = fakeAudit();
    const gw = fakeGateway();
    const dispatch = fakeDispatch();
    const sub = new ErrandPaidSubscriber(audit, gw, dispatch);
    await sub.handle(PAYLOAD);
    expect(dispatch.createTask).toHaveBeenCalledWith('600001', 'paid');
    expect(gw.getui.pushOne).toHaveBeenCalled();
    expect(gw.sms.send).toHaveBeenCalledWith('10001', 'ORDER_PAID', '600001');
    expect(audit.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'errand-order', afterStatus: 'DISPATCHING' }),
    );
  });

  it('dispatch.createTask 抛异常 — 主流程不阻塞,继续 push/sms/audit', async () => {
    const audit = fakeAudit();
    const gw = fakeGateway();
    const dispatch = fakeDispatch(true);
    const sub = new ErrandPaidSubscriber(audit, gw, dispatch);
    await expect(sub.handle(PAYLOAD)).resolves.toBeUndefined();
    expect(gw.getui.pushOne).toHaveBeenCalled();
    expect(gw.sms.send).toHaveBeenCalled();
    expect(audit.writeAudit).toHaveBeenCalled();
  });

  it('push 失败不阻塞', async () => {
    const audit = fakeAudit();
    const gw = fakeGateway();
    (gw.getui.pushOne as jest.Mock).mockRejectedValueOnce(new Error('push fail'));
    const sub = new ErrandPaidSubscriber(audit, gw, fakeDispatch());
    await expect(sub.handle(PAYLOAD)).resolves.toBeUndefined();
    expect(audit.writeAudit).toHaveBeenCalled();
  });

  it('sms 失败不阻塞', async () => {
    const audit = fakeAudit();
    const gw = fakeGateway();
    (gw.sms.send as jest.Mock).mockRejectedValueOnce(new Error('sms fail'));
    const sub = new ErrandPaidSubscriber(audit, gw, fakeDispatch());
    await expect(sub.handle(PAYLOAD)).resolves.toBeUndefined();
    expect(audit.writeAudit).toHaveBeenCalled();
  });

  it('audit traceId 含 orderId', async () => {
    const audit = fakeAudit();
    const sub = new ErrandPaidSubscriber(audit, fakeGateway(), fakeDispatch());
    await sub.handle(PAYLOAD);
    const call = audit.writeAudit.mock.calls[0]![0];
    expect(call.traceId).toContain(PAYLOAD.orderId);
  });
});
