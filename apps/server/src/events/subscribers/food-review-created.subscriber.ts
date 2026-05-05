import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { EventName, type FoodReviewCreatedPayload } from '../events';

@Injectable()
export class FoodReviewCreatedSubscriber {
  private readonly logger = new Logger(FoodReviewCreatedSubscriber.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(EventName.FoodReviewCreated)
  async handle(payload: FoodReviewCreatedPayload): Promise<void> {
    this.logger.log(
      `[food-review.created] reviewId=${payload.reviewId} orderId=${payload.orderId} rating=${payload.rating}`,
    );
    await this.auditLog.writeAudit({
      traceId: `food-review-${payload.reviewId}`,
      operatorType: 'customer',
      operatorId: payload.customerId,
      targetType: 'food-review',
      targetId: payload.reviewId,
      summary: `订单 ${payload.orderId} 评价 ${payload.rating} 星`,
    });
  }
}
