import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type RiderTaskAcceptedPayload } from '../events';

@Injectable()
export class RiderTaskAcceptedSubscriber {
  private readonly logger = new Logger(RiderTaskAcceptedSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.RiderTaskAccepted)
  async handle(payload: RiderTaskAcceptedPayload): Promise<void> {
    this.logger.log(`[rider-task.accepted] taskId=${payload.riderTaskId} rider=${payload.riderId}`);

    await this.gateway.sms
      .send(payload.bizOrderId, 'RIDER_ASSIGNED', payload.riderId)
      .catch((err: unknown) => this.logger.warn({ err }, '[rider-task.accepted] sms failed (non-blocking)'));

    await this.auditLog.writeAudit({
      traceId: `rider-task-accepted-${payload.riderTaskId}`,
      operatorType: 'rider',
      operatorId: payload.riderId,
      targetType: 'rider-task',
      targetId: payload.riderTaskId,
      afterStatus: 'ASSIGNED',
      summary: `骑手 ${payload.riderId} 接单 ${payload.bizType} ${payload.bizOrderId}`,
    });
  }
}
