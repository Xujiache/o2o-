import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { EventName, type RateRuleChangedPayload } from '../events';

@Injectable()
export class RateRuleChangedSubscriber {
  private readonly logger = new Logger(RateRuleChangedSubscriber.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(EventName.RateRuleChanged)
  async handle(payload: RateRuleChangedPayload): Promise<void> {
    this.logger.log(
      `[rate-rule.changed] rateRuleId=${payload.rateRuleId} city=${payload.cityCode} category=${payload.categoryId ?? 'ALL'} effectiveAt=${payload.effectiveAt}`,
    );
    await this.auditLog.writeAudit({
      traceId: `rate-rule-${payload.rateRuleId}`,
      operatorType: 'admin',
      operatorId: payload.operatorAdminId,
      targetType: 'rate-rule',
      targetId: payload.rateRuleId,
      afterStatus: 'CHANGED',
      summary: `费率变更 ${payload.cityCode} 类目=${payload.categoryId ?? 'ALL'} 生效=${payload.effectiveAt}`,
    });
  }
}
