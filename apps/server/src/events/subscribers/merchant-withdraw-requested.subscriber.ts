import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type MerchantWithdrawRequestedPayload } from '../events';

/**
 * 商家发起提现后:
 *  1. sms 通知商家(提现申请已提交)
 *  2. audit_log
 */
@Injectable()
export class MerchantWithdrawRequestedSubscriber {
  private readonly logger = new Logger(MerchantWithdrawRequestedSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.MerchantWithdrawRequested)
  async handle(payload: MerchantWithdrawRequestedPayload): Promise<void> {
    this.logger.log(
      `[merchant-withdrawal.requested] withdrawalId=${payload.withdrawalId} amount=${payload.amountCents}`,
    );

    await this.gateway.sms
      .send(payload.merchantId, 'WITHDRAW_REQUESTED', String(payload.amountCents))
      .catch((err: unknown) =>
        this.logger.warn({ err }, '[merchant-withdrawal.requested] sms send failed (non-blocking)'),
      );

    await this.auditLog.writeAudit({
      traceId: `merchant-withdraw-requested-${payload.withdrawalId}`,
      operatorType: 'merchant',
      operatorId: payload.merchantId,
      targetType: 'merchant-withdrawal',
      targetId: payload.withdrawalId,
      afterStatus: 'PENDING',
      summary: `提现申请 amount=¥${(Number(payload.amountCents) / 100).toFixed(2)}`,
    });
  }
}
