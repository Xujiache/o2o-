import type { AuditLogService } from '../../modules/audit-log/audit-log.service';
import type { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';

import { DispatchStartedSubscriber } from './dispatch-started.subscriber';
import { RiderArrivedPickupSubscriber } from './rider-arrived-pickup.subscriber';
import { RiderDeliveredSubscriber } from './rider-delivered.subscriber';
import { RiderEarningGeneratedSubscriber } from './rider-earning-generated.subscriber';
import { RiderExceptionReportedSubscriber } from './rider-exception-reported.subscriber';
import { RiderPickedUpSubscriber } from './rider-picked-up.subscriber';
import { RiderTaskAcceptedSubscriber } from './rider-task-accepted.subscriber';

const fakeAudit = (): jest.Mocked<AuditLogService> =>
  ({ writeAudit: jest.fn(async () => undefined) }) as unknown as jest.Mocked<AuditLogService>;

const fakeGateway = (): jest.Mocked<IntegrationGatewayService> =>
  ({
    getui: { pushOne: jest.fn(async () => ({ taskId: 't1' })) },
    sms: { send: jest.fn(async () => ({ providerRequestId: 'r1' })) },
  }) as unknown as jest.Mocked<IntegrationGatewayService>;

describe('Stage 8 subscribers', () => {
  describe('DispatchStartedSubscriber', () => {
    it('audit + push 每个候选骑手', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new DispatchStartedSubscriber(audit, gw).handle({
        dispatchTaskId: 'D1',
        bizType: 'FOOD',
        bizOrderId: '510001',
        bizTaskId: null,
        candidateRiderIds: ['30001', '30002'],
        dispatchedAt: 1,
      });
      expect(gw.getui.pushOne).toHaveBeenCalledTimes(2);
      expect(audit.writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'dispatch-task', afterStatus: 'PENDING' }),
      );
    });

    it('无候选骑手 push 不调用,audit 仍记录', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new DispatchStartedSubscriber(audit, gw).handle({
        dispatchTaskId: 'D2',
        bizType: 'ERRAND',
        bizOrderId: '610001',
        bizTaskId: '600001',
        candidateRiderIds: [],
        dispatchedAt: 1,
      });
      expect(gw.getui.pushOne).not.toHaveBeenCalled();
      expect(audit.writeAudit).toHaveBeenCalled();
    });
  });

  describe('RiderTaskAcceptedSubscriber', () => {
    it('audit + sms', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new RiderTaskAcceptedSubscriber(audit, gw).handle({
        riderTaskId: 'RT1',
        dispatchTaskId: 'D1',
        riderId: '30001',
        bizType: 'FOOD',
        bizOrderId: '510001',
        acceptedAt: 1,
      });
      expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ afterStatus: 'ASSIGNED' }));
      expect(gw.sms.send).toHaveBeenCalled();
    });
  });

  describe('RiderArrivedPickupSubscriber', () => {
    it('FOOD 推送商家;audit 记录', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new RiderArrivedPickupSubscriber(audit, gw).handle({
        riderTaskId: 'RT1',
        riderId: '30001',
        bizType: 'FOOD',
        bizOrderId: '510001',
        lng: 0,
        lat: 0,
        arrivedAt: 1,
      });
      expect(gw.getui.pushOne).toHaveBeenCalled();
      expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ afterStatus: 'ARRIVED_PICKUP' }));
    });

    it('ERRAND 不 push 商家', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new RiderArrivedPickupSubscriber(audit, gw).handle({
        riderTaskId: 'RT2',
        riderId: '30001',
        bizType: 'ERRAND',
        bizOrderId: '610001',
        lng: 0,
        lat: 0,
        arrivedAt: 1,
      });
      expect(gw.getui.pushOne).not.toHaveBeenCalled();
    });
  });

  describe('RiderPickedUpSubscriber', () => {
    it('audit + sms', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new RiderPickedUpSubscriber(audit, gw).handle({
        riderTaskId: 'RT1',
        riderId: '30001',
        bizType: 'FOOD',
        bizOrderId: '510001',
        pickedUpAt: 1,
      });
      expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ afterStatus: 'PICKED_UP' }));
      expect(gw.sms.send).toHaveBeenCalled();
    });
  });

  describe('RiderDeliveredSubscriber', () => {
    it('audit + sms', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new RiderDeliveredSubscriber(audit, gw).handle({
        riderTaskId: 'RT1',
        riderId: '30001',
        bizType: 'FOOD',
        bizOrderId: '510001',
        deliveryProof: 'photo:1',
        deliveredAt: 1,
      });
      expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ afterStatus: 'DELIVERED' }));
      expect(gw.sms.send).toHaveBeenCalled();
    });
  });

  describe('RiderExceptionReportedSubscriber', () => {
    it('audit + push admin', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new RiderExceptionReportedSubscriber(audit, gw).handle({
        riderViolationId: 'V1',
        riderTaskId: 'RT1',
        riderId: '30001',
        exceptionType: 'EXCEPTION',
        description: '客户拒收',
        platformHandleRequired: true,
        reportedAt: 1,
      });
      expect(gw.getui.pushOne).toHaveBeenCalled();
      expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ afterStatus: 'PENDING_PLATFORM' }));
    });
  });

  describe('RiderEarningGeneratedSubscriber', () => {
    it('audit + push 骑手', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new RiderEarningGeneratedSubscriber(audit, gw).handle({
        riderEarningId: 'E1',
        riderId: '30001',
        settleDate: 20260505,
        totalAmount: '15000',
        generatedAt: 1,
      });
      expect(gw.getui.pushOne).toHaveBeenCalled();
      expect(audit.writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'rider-earning', afterStatus: 'PENDING' }),
      );
    });
  });
});
