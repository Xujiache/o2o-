import type { AuditLogService } from '../../modules/audit-log/audit-log.service';
import type { DispatchService } from '../../modules/dispatch/dispatch.service';
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

const fakeErrandDispatch = (fail = false): jest.Mocked<ErrandDispatchService> =>
  ({
    createTask: jest.fn(async () => {
      if (fail) throw new Error('errand dispatch failed');
      /* eslint-disable @typescript-eslint/no-explicit-any */
      return { errandTaskId: 'ET1' } as any;
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }),
  }) as unknown as jest.Mocked<ErrandDispatchService>;

const fakeDispatch = (): jest.Mocked<DispatchService> =>
  ({
    /* eslint-disable @typescript-eslint/no-explicit-any */
    dispatch: jest.fn(async () => ({ dispatchTaskId: 'D1' }) as any),
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }) as unknown as jest.Mocked<DispatchService>;

describe('ErrandPaidSubscriber', () => {
  const PAYLOAD = {
    orderId: '600001',
    customerId: '10001',
    paidAmount: '1500',
    paidAt: 1714867800000,
  };

  it('正常路径:errandDispatch.createTask + dispatch.dispatch + push + sms + audit', async () => {
    const audit = fakeAudit();
    const gw = fakeGateway();
    const errandDispatch = fakeErrandDispatch();
    const dispatch = fakeDispatch();
    const sub = new ErrandPaidSubscriber(audit, gw, errandDispatch, dispatch);
    await sub.handle(PAYLOAD);
    expect(errandDispatch.createTask).toHaveBeenCalledWith('600001', 'paid');
    expect(dispatch.dispatch).toHaveBeenCalledWith({
      bizType: 'ERRAND',
      bizOrderId: '600001',
      bizTaskId: 'ET1',
    });
    expect(gw.getui.pushOne).toHaveBeenCalled();
    expect(gw.sms.send).toHaveBeenCalledWith('10001', 'ORDER_PAID', '600001');
    expect(audit.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'errand-order', afterStatus: 'DISPATCHING' }),
    );
  });

  it('errandDispatch.createTask 抛异常 — 主流程不阻塞,继续 push/sms/audit', async () => {
    const audit = fakeAudit();
    const gw = fakeGateway();
    const errandDispatch = fakeErrandDispatch(true);
    const sub = new ErrandPaidSubscriber(audit, gw, errandDispatch, fakeDispatch());
    await expect(sub.handle(PAYLOAD)).resolves.toBeUndefined();
    expect(gw.getui.pushOne).toHaveBeenCalled();
    expect(gw.sms.send).toHaveBeenCalled();
    expect(audit.writeAudit).toHaveBeenCalled();
  });

  it('push 失败不阻塞', async () => {
    const audit = fakeAudit();
    const gw = fakeGateway();
    (gw.getui.pushOne as jest.Mock).mockRejectedValueOnce(new Error('push fail'));
    const sub = new ErrandPaidSubscriber(audit, gw, fakeErrandDispatch(), fakeDispatch());
    await expect(sub.handle(PAYLOAD)).resolves.toBeUndefined();
    expect(audit.writeAudit).toHaveBeenCalled();
  });

  it('sms 失败不阻塞', async () => {
    const audit = fakeAudit();
    const gw = fakeGateway();
    (gw.sms.send as jest.Mock).mockRejectedValueOnce(new Error('sms fail'));
    const sub = new ErrandPaidSubscriber(audit, gw, fakeErrandDispatch(), fakeDispatch());
    await expect(sub.handle(PAYLOAD)).resolves.toBeUndefined();
    expect(audit.writeAudit).toHaveBeenCalled();
  });

  it('audit traceId 含 orderId', async () => {
    const audit = fakeAudit();
    const sub = new ErrandPaidSubscriber(audit, fakeGateway(), fakeErrandDispatch(), fakeDispatch());
    await sub.handle(PAYLOAD);
    const call = audit.writeAudit.mock.calls[0]![0];
    expect(call.traceId).toContain(PAYLOAD.orderId);
  });
});
