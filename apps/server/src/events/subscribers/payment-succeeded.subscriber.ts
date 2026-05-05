import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { EventName, type PaymentSucceededPayload } from '../events';

@Injectable()
export class PaymentSucceededSubscriber {
  private readonly logger = new Logger(PaymentSucceededSubscriber.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(EventName.PaymentSucceeded)
  async handle(payload: PaymentSucceededPayload): Promise<void> {
    this.logger.log(
      `[payment.succeeded] payOrderNo=${payload.payOrderNo} bizId=${payload.bizId} channel=${payload.payChannel} amount=${payload.paidAmount}`,
    );
    await this.auditLog.writeAudit({
      traceId: `payment-succeeded-${payload.payOrderId}`,
      operatorType: 'system',
      operatorId: 'callback',
      targetType: 'payment-order',
      targetId: payload.payOrderId,
      afterStatus: 'success',
      summary: `${payload.payChannel} 支付成功 ${payload.paidAmount} 分(${payload.bizType} ${payload.bizId})`,
    });
  }
}
