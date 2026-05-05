import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type MerchantSettlementGeneratedPayload } from '../events';

/**
 * T+1 结算单生成后:
 *  1. push 商家(可在结算页查看)
 *  2. audit_log
 */
@Injectable()
export class MerchantSettlementGeneratedSubscriber {
  private readonly logger = new Logger(MerchantSettlementGeneratedSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.MerchantSettlementGenerated)
  async handle(payload: MerchantSettlementGeneratedPayload): Promise<void> {
    this.logger.log(
      `[merchant-settlement.generated] settlementId=${payload.settlementId} netCents=${payload.netCents}`,
    );

    await this.gateway.getui
      .pushOne({
        cid: `merchant:${payload.merchantId}`,
        title: '结算单已生成',
        body: `本期结算金额 ¥${(Number(payload.netCents) / 100).toFixed(2)}`,
        payload: { settlementId: payload.settlementId, scene: 'settlement-generated' },
      })
      .catch((err: unknown) => this.logger.warn({ err }, '[merchant-settlement.generated] push failed (non-blocking)'));

    await this.auditLog.writeAudit({
      traceId: `merchant-settlement-generated-${payload.settlementId}`,
      operatorType: 'system',
      operatorId: 'scheduler',
      targetType: 'merchant-settlement',
      targetId: payload.settlementId,
      afterStatus: 'PENDING',
      summary: `T+1 结算 net=¥${(Number(payload.netCents) / 100).toFixed(2)}`,
    });
  }
}
