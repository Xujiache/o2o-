import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { EventName, type ErrandQuoteCreatedPayload } from '../events';

@Injectable()
export class ErrandQuoteCreatedSubscriber {
  private readonly logger = new Logger(ErrandQuoteCreatedSubscriber.name);
  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(EventName.ErrandQuoteCreated)
  async handle(payload: ErrandQuoteCreatedPayload): Promise<void> {
    this.logger.log(
      `[errand-quote.created] quoteId=${payload.quoteId} customer=${payload.customerId} type=${payload.typeCode}`,
    );
    await this.auditLog.writeAudit({
      traceId: `errand-quote-${payload.quoteId}`,
      operatorType: 'customer',
      operatorId: payload.customerId,
      targetType: 'errand-quote',
      targetId: payload.quoteId,
      summary: `跑腿报价 ${payload.quoteId} 已创建,应付 ${payload.payableAmount} 分`,
    });
  }
}
