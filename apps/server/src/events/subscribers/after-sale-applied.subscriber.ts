import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type AfterSaleAppliedPayload } from '../events';

/**
 * 用户申请售后后:
 *  1. push 商家工作台(待审核)
 *  2. audit_log
 */
@Injectable()
export class AfterSaleAppliedSubscriber {
  private readonly logger = new Logger(AfterSaleAppliedSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.AfterSaleApplied)
  async handle(payload: AfterSaleAppliedPayload): Promise<void> {
    this.logger.log(
      `[after-sale.applied] afterSaleId=${payload.afterSaleId} orderId=${payload.orderId} amount=${payload.amountCents}`,
    );

    await this.gateway.getui
      .pushOne({
        cid: `merchant:${payload.merchantId}`,
        title: '新售后申请',
        body: `订单 ${payload.orderId} 用户申请售后:${payload.reason}`,
        payload: { afterSaleId: payload.afterSaleId, scene: 'after-sale-applied' },
      })
      .catch((err: unknown) => this.logger.warn({ err }, '[after-sale.applied] push failed (non-blocking)'));

    await this.auditLog.writeAudit({
      traceId: `after-sale-applied-${payload.afterSaleId}`,
      operatorType: 'customer',
      operatorId: payload.customerId,
      targetType: 'after-sale',
      targetId: payload.afterSaleId,
      afterStatus: 'PENDING_MERCHANT',
      summary: `用户申请售后 amount=¥${(Number(payload.amountCents) / 100).toFixed(2)}`,
    });
  }
}
