import type { AuditLogService } from '../../modules/audit-log/audit-log.service';
import type { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';

import { AfterSaleAppliedSubscriber } from './after-sale-applied.subscriber';
import { AfterSaleReviewedByMerchantSubscriber } from './after-sale-reviewed-by-merchant.subscriber';
import { FoodReadyForPickupSubscriber } from './food-ready-for-pickup.subscriber';
import { MerchantOrderAcceptedSubscriber } from './merchant-order-accepted.subscriber';
import { MerchantOrderPushedSubscriber } from './merchant-order-pushed.subscriber';
import { MerchantOrderRejectedSubscriber } from './merchant-order-rejected.subscriber';
import { MerchantSettlementGeneratedSubscriber } from './merchant-settlement-generated.subscriber';
import { MerchantWithdrawRequestedSubscriber } from './merchant-withdraw-requested.subscriber';
import { OrderReviewSubmittedSubscriber } from './order-review-submitted.subscriber';

const fakeAudit = (): jest.Mocked<AuditLogService> =>
  ({
    writeAudit: jest.fn(async () => undefined),
  }) as unknown as jest.Mocked<AuditLogService>;

const fakeGateway = (): jest.Mocked<IntegrationGatewayService> =>
  ({
    getui: { pushOne: jest.fn(async () => ({ taskId: 't1' })) },
    sms: { send: jest.fn(async () => ({ providerRequestId: 'r1' })) },
  }) as unknown as jest.Mocked<IntegrationGatewayService>;

const fakeFailingGateway = (): jest.Mocked<IntegrationGatewayService> =>
  ({
    getui: { pushOne: jest.fn(async () => Promise.reject(new Error('push down'))) },
    sms: { send: jest.fn(async () => Promise.reject(new Error('sms down'))) },
  }) as unknown as jest.Mocked<IntegrationGatewayService>;

describe('Stage 7 subscribers', () => {
  describe('MerchantOrderPushedSubscriber', () => {
    it('audit + push merchant', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new MerchantOrderPushedSubscriber(audit, gw).handle({
        orderId: '510001',
        storeId: '20001',
        merchantId: '30001',
        payableAmountCents: '5000',
        pushedAt: 1,
      });
      expect(audit.writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'food-order', afterStatus: 'PAID_WAIT_MERCHANT' }),
      );
      expect(gw.getui.pushOne).toHaveBeenCalled();
    });

    it('push 失败不阻塞 audit', async () => {
      const audit = fakeAudit();
      await new MerchantOrderPushedSubscriber(audit, fakeFailingGateway()).handle({
        orderId: '1',
        storeId: '1',
        merchantId: '1',
        payableAmountCents: '0',
        pushedAt: 0,
      });
      expect(audit.writeAudit).toHaveBeenCalled();
    });
  });

  describe('MerchantOrderAcceptedSubscriber', () => {
    it('audit + sms', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new MerchantOrderAcceptedSubscriber(audit, gw).handle({
        orderId: '510001',
        storeId: '20001',
        merchantId: '30001',
        expectedReadyAt: 100,
        acceptedAt: 1,
      });
      expect(audit.writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({ beforeStatus: 'PAID_WAIT_MERCHANT', afterStatus: 'PREPARING' }),
      );
      expect(gw.sms.send).toHaveBeenCalled();
    });
  });

  describe('MerchantOrderRejectedSubscriber', () => {
    it('audit + sms 通知拒单', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new MerchantOrderRejectedSubscriber(audit, gw).handle({
        orderId: '510001',
        storeId: '20001',
        merchantId: '30001',
        rejectReason: '商品已售罄',
        rejectedAt: 1,
      });
      expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ afterStatus: 'CANCELLED' }));
      expect(gw.sms.send).toHaveBeenCalled();
    });
  });

  describe('FoodReadyForPickupSubscriber', () => {
    it('audit + push 骑手', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new FoodReadyForPickupSubscriber(audit, gw).handle({
        orderId: '510001',
        storeId: '20001',
        merchantId: '30001',
        readyAt: 1,
      });
      expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ afterStatus: 'READY_FOR_PICKUP' }));
      expect(gw.getui.pushOne).toHaveBeenCalled();
    });
  });

  describe('AfterSaleAppliedSubscriber', () => {
    it('audit + push 商家', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new AfterSaleAppliedSubscriber(audit, gw).handle({
        afterSaleId: '700001',
        orderId: '510001',
        storeId: '20001',
        merchantId: '30001',
        customerId: '10001',
        amountCents: '5000',
        reason: '送错餐',
        appliedAt: 1,
      });
      expect(audit.writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'after-sale', afterStatus: 'PENDING_MERCHANT' }),
      );
      expect(gw.getui.pushOne).toHaveBeenCalled();
    });
  });

  describe('AfterSaleReviewedByMerchantSubscriber', () => {
    it('APPROVE 分支:audit afterStatus=APPROVED_BY_MERCHANT', async () => {
      const audit = fakeAudit();
      await new AfterSaleReviewedByMerchantSubscriber(audit, fakeGateway()).handle({
        afterSaleId: '700001',
        orderId: '510001',
        storeId: '20001',
        decision: 'APPROVE',
        rejectReason: null,
        reviewedAt: 1,
      });
      expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ afterStatus: 'APPROVED_BY_MERCHANT' }));
    });

    it('REJECT 分支:audit afterStatus=REJECTED_BY_MERCHANT', async () => {
      const audit = fakeAudit();
      await new AfterSaleReviewedByMerchantSubscriber(audit, fakeGateway()).handle({
        afterSaleId: '700001',
        orderId: '510001',
        storeId: '20001',
        decision: 'REJECT',
        rejectReason: '无问题',
        reviewedAt: 1,
      });
      expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ afterStatus: 'REJECTED_BY_MERCHANT' }));
    });
  });

  describe('OrderReviewSubmittedSubscriber', () => {
    it('audit + push 商家', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new OrderReviewSubmittedSubscriber(audit, gw).handle({
        reviewId: '800001',
        orderId: '510001',
        storeId: '20001',
        merchantId: '30001',
        customerId: '10001',
        rating: 5,
        submittedAt: 1,
      });
      expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ targetType: 'order-review' }));
      expect(gw.getui.pushOne).toHaveBeenCalled();
    });
  });

  describe('MerchantSettlementGeneratedSubscriber', () => {
    it('audit + push 商家', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new MerchantSettlementGeneratedSubscriber(audit, gw).handle({
        settlementId: '900001',
        storeId: '20001',
        merchantId: '30001',
        periodStart: 0,
        periodEnd: 1,
        netCents: '15000',
        generatedAt: 1,
      });
      expect(audit.writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'merchant-settlement', afterStatus: 'PENDING' }),
      );
      expect(gw.getui.pushOne).toHaveBeenCalled();
    });
  });

  describe('MerchantWithdrawRequestedSubscriber', () => {
    it('audit + sms', async () => {
      const audit = fakeAudit();
      const gw = fakeGateway();
      await new MerchantWithdrawRequestedSubscriber(audit, gw).handle({
        withdrawalId: 'A1',
        storeId: '20001',
        merchantId: '30001',
        amountCents: '10000',
        requestedAt: 1,
      });
      expect(audit.writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'merchant-withdrawal', afterStatus: 'PENDING' }),
      );
      expect(gw.sms.send).toHaveBeenCalled();
    });
  });
});
