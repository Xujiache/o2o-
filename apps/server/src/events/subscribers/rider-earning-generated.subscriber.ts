import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type RiderEarningGeneratedPayload } from '../events';

@Injectable()
export class RiderEarningGeneratedSubscriber {
  private readonly logger = new Logger(RiderEarningGeneratedSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.RiderEarningGenerated)
  async handle(payload: RiderEarningGeneratedPayload): Promise<void> {
    this.logger.log(`[rider-earning.generated] earningId=${payload.riderEarningId} total=${payload.totalAmount}`);

    await this.gateway.getui
      .pushOne({
        cid: `rider:${payload.riderId}`,
        title: '收益已结算',
        body: `日期 ${payload.settleDate} 收益 ¥${(Number(payload.totalAmount) / 100).toFixed(2)}`,
        payload: { earningId: payload.riderEarningId, scene: 'earning-generated' },
      })
      .catch((err: unknown) => this.logger.warn({ err }, '[rider-earning.generated] push failed (non-blocking)'));

    await this.auditLog.writeAudit({
      traceId: `rider-earning-generated-${payload.riderEarningId}`,
      operatorType: 'system',
      operatorId: 'scheduler',
      targetType: 'rider-earning',
      targetId: payload.riderEarningId,
      afterStatus: 'PENDING',
      summary: `T+1 结算 net=¥${(Number(payload.totalAmount) / 100).toFixed(2)}`,
    });
  }
}
