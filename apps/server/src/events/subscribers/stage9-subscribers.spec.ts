import { ArbitrationCompletedSubscriber } from './arbitration-completed.subscriber';
import { CouponPublishedSubscriber } from './coupon-published.subscriber';
import { ManualDispatchCreatedSubscriber } from './manual-dispatch-created.subscriber';
import { OrderReassignedSubscriber } from './order-reassigned.subscriber';
import { RateRuleChangedSubscriber } from './rate-rule-changed.subscriber';
import { RefundExecutedSubscriber } from './refund-executed.subscriber';
import { ReportGeneratedSubscriber } from './report-generated.subscriber';

/* eslint-disable @typescript-eslint/no-explicit-any */
const auditLog: any = { writeAudit: jest.fn(async () => undefined) };
const gateway: any = { getui: { pushOne: jest.fn(async () => undefined) } };

describe('Stage 9 Subscribers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ManualDispatchCreatedSubscriber: 写审计日志', async () => {
    const sub = new ManualDispatchCreatedSubscriber(auditLog);
    await sub.handle({
      dispatchTaskId: 'D1',
      riderId: 'R1',
      operatorAdminId: '1',
      reason: 'rebalance',
      createdAt: 1,
    });
    expect(auditLog.writeAudit).toHaveBeenCalled();
  });

  it('OrderReassignedSubscriber: 推送旧+新骑手', async () => {
    const sub = new OrderReassignedSubscriber(gateway);
    await sub.handle({
      dispatchTaskId: 'D1',
      oldRiderId: 'R0',
      newRiderId: 'R1',
      operatorAdminId: '1',
      reassignedAt: 1,
    });
    expect(gateway.getui.pushOne).toHaveBeenCalledTimes(2);
  });

  it('OrderReassignedSubscriber: oldRiderId=null 只推新骑手', async () => {
    const sub = new OrderReassignedSubscriber(gateway);
    await sub.handle({
      dispatchTaskId: 'D2',
      oldRiderId: null,
      newRiderId: 'R2',
      operatorAdminId: '1',
      reassignedAt: 1,
    });
    expect(gateway.getui.pushOne).toHaveBeenCalledTimes(1);
  });

  it('ArbitrationCompletedSubscriber: APPROVE → afterStatus REFUNDED', async () => {
    const sub = new ArbitrationCompletedSubscriber(auditLog);
    await sub.handle({
      arbitrationId: 'A1',
      afterSaleId: 'AS1',
      responsibleParty: 'MERCHANT',
      decision: 'APPROVE',
      refundAmount: '1000',
      penalty: '0',
      refundOrderId: 'RF1',
      operatorAdminId: '1',
      completedAt: 1,
    });
    expect(auditLog.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ afterStatus: 'REFUNDED' }));
  });

  it('ArbitrationCompletedSubscriber: REJECT → COMPLETED', async () => {
    const sub = new ArbitrationCompletedSubscriber(auditLog);
    await sub.handle({
      arbitrationId: 'A2',
      afterSaleId: 'AS2',
      responsibleParty: 'CUSTOMER',
      decision: 'REJECT',
      refundAmount: '0',
      penalty: '0',
      refundOrderId: null,
      operatorAdminId: '1',
      completedAt: 1,
    });
    expect(auditLog.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ afterStatus: 'COMPLETED' }));
  });

  it('RefundExecutedSubscriber: 写审计日志', async () => {
    const sub = new RefundExecutedSubscriber(auditLog);
    await sub.handle({
      refundOrderId: 'RF1',
      refundNo: 'RF20260506001',
      bizType: 'FOOD',
      bizOrderId: '510001',
      amount: '1000',
      status: 'SUCCESS',
      executedAt: 1,
    });
    expect(auditLog.writeAudit).toHaveBeenCalled();
  });

  it('CouponPublishedSubscriber: 写审计日志', async () => {
    const sub = new CouponPublishedSubscriber(auditLog);
    await sub.handle({
      couponRuleId: 'C1',
      couponName: 'X',
      bizType: 'FOOD',
      totalStock: 100,
      validFrom: 1,
      validTo: 2,
      publishedAt: 1,
    });
    expect(auditLog.writeAudit).toHaveBeenCalled();
  });

  it('RateRuleChangedSubscriber: 写审计日志', async () => {
    const sub = new RateRuleChangedSubscriber(auditLog);
    await sub.handle({
      rateRuleId: 'RR1',
      cityCode: 'BJ',
      categoryId: null,
      effectiveAt: 1,
      operatorAdminId: '1',
      changedAt: 1,
    });
    expect(auditLog.writeAudit).toHaveBeenCalled();
  });

  it('ReportGeneratedSubscriber: 仅打日志(无副作用)', () => {
    const sub = new ReportGeneratedSubscriber();
    expect(() => sub.handle({ snapshotDate: '2026-05-06', cityCode: 'BJ', generatedAt: 1 })).not.toThrow();
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */
