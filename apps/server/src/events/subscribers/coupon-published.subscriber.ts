import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { type CouponPublishedPayload, EventName } from '../events';

@Injectable()
export class CouponPublishedSubscriber {
  private readonly logger = new Logger(CouponPublishedSubscriber.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(EventName.CouponPublished)
  async handle(payload: CouponPublishedPayload): Promise<void> {
    this.logger.log(
      `[coupon.published] couponRuleId=${payload.couponRuleId} ${payload.couponName} bizType=${payload.bizType} stock=${payload.totalStock}`,
    );
    await this.auditLog.writeAudit({
      traceId: `coupon-published-${payload.couponRuleId}`,
      operatorType: 'admin',
      operatorId: 'system',
      targetType: 'coupon-rule',
      targetId: payload.couponRuleId,
      afterStatus: 'PUBLISHED',
      summary: `发券 ${payload.couponName} ${payload.bizType} 库存=${payload.totalStock}`,
    });
  }
}
