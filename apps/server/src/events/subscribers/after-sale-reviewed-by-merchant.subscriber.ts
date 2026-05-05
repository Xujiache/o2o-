import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type AfterSaleReviewedByMerchantPayload } from '../events';

/**
 * 商家审核售后后:
 *  1. APPROVE → 触发 payment.refund mock(实际由后续 stage 9 接真退款)
 *  2. REJECT → 转交平台仲裁(stage 9)
 *  3. sms 通知用户
 *  4. audit_log
 */
@Injectable()
export class AfterSaleReviewedByMerchantSubscriber {
  private readonly logger = new Logger(AfterSaleReviewedByMerchantSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.AfterSaleReviewedByMerchant)
  async handle(payload: AfterSaleReviewedByMerchantPayload): Promise<void> {
    this.logger.log(
      `[after-sale.reviewed-by-merchant] afterSaleId=${payload.afterSaleId} decision=${payload.decision}`,
    );

    const template = payload.decision === 'APPROVE' ? 'AFTER_SALE_APPROVED' : 'AFTER_SALE_REJECTED';
    await this.gateway.sms
      .send(payload.orderId, template, payload.rejectReason ?? '')
      .catch((err: unknown) =>
        this.logger.warn({ err }, '[after-sale.reviewed-by-merchant] sms send failed (non-blocking)'),
      );

    await this.auditLog.writeAudit({
      traceId: `after-sale-reviewed-${payload.afterSaleId}`,
      operatorType: 'merchant',
      operatorId: payload.storeId,
      targetType: 'after-sale',
      targetId: payload.afterSaleId,
      beforeStatus: 'PENDING_MERCHANT',
      afterStatus: payload.decision === 'APPROVE' ? 'APPROVED_BY_MERCHANT' : 'REJECTED_BY_MERCHANT',
      summary:
        payload.decision === 'APPROVE'
          ? `售后 ${payload.afterSaleId} 商家通过`
          : `售后 ${payload.afterSaleId} 商家拒绝(${payload.rejectReason ?? ''})`,
    });
  }
}
