import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type OrderReviewSubmittedPayload } from '../events';

/**
 * 用户提交评价后:
 *  1. push 商家(可回复)
 *  2. audit_log
 */
@Injectable()
export class OrderReviewSubmittedSubscriber {
  private readonly logger = new Logger(OrderReviewSubmittedSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.OrderReviewSubmitted)
  async handle(payload: OrderReviewSubmittedPayload): Promise<void> {
    this.logger.log(`[order-review.submitted] reviewId=${payload.reviewId} rating=${payload.rating}`);

    await this.gateway.getui
      .pushOne({
        cid: `merchant:${payload.merchantId}`,
        title: '新用户评价',
        body: `订单 ${payload.orderId} 用户已评价 ${payload.rating} 星`,
        payload: { reviewId: payload.reviewId, scene: 'review-submitted' },
      })
      .catch((err: unknown) => this.logger.warn({ err }, '[order-review.submitted] push failed (non-blocking)'));

    await this.auditLog.writeAudit({
      traceId: `order-review-submitted-${payload.reviewId}`,
      operatorType: 'customer',
      operatorId: payload.customerId,
      targetType: 'order-review',
      targetId: payload.reviewId,
      summary: `用户评价提交 rating=${payload.rating}`,
    });
  }
}
