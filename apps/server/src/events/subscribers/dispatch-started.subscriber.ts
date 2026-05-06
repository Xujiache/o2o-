import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { type DispatchStartedPayload, EventName } from '../events';

@Injectable()
export class DispatchStartedSubscriber {
  private readonly logger = new Logger(DispatchStartedSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.DispatchStarted)
  async handle(payload: DispatchStartedPayload): Promise<void> {
    this.logger.log(
      `[dispatch.started] dispatchTaskId=${payload.dispatchTaskId} bizType=${payload.bizType} candidates=${payload.candidateRiderIds.length}`,
    );

    for (const riderId of payload.candidateRiderIds) {
      await this.gateway.getui
        .pushOne({
          cid: `rider:${riderId}`,
          title: '新派单',
          body: `${payload.bizType === 'FOOD' ? '外卖' : '跑腿'}订单等待您接单`,
          payload: { dispatchTaskId: payload.dispatchTaskId, bizType: payload.bizType },
        })
        .catch((err: unknown) => this.logger.warn({ err }, '[dispatch.started] push failed (non-blocking)'));
    }

    await this.auditLog.writeAudit({
      traceId: `dispatch-started-${payload.dispatchTaskId}`,
      operatorType: 'system',
      operatorId: 'dispatch',
      targetType: 'dispatch-task',
      targetId: payload.dispatchTaskId,
      afterStatus: 'PENDING',
      summary: `派单 ${payload.dispatchTaskId} ${payload.bizType} ${payload.bizOrderId} candidates=${payload.candidateRiderIds.length}`,
    });
  }
}
