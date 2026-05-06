import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type RiderPickedUpPayload } from '../events';

@Injectable()
export class RiderPickedUpSubscriber {
  private readonly logger = new Logger(RiderPickedUpSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.RiderPickedUp)
  async handle(payload: RiderPickedUpPayload): Promise<void> {
    this.logger.log(`[rider-task.picked-up] taskId=${payload.riderTaskId}`);

    await this.gateway.sms
      .send(payload.bizOrderId, 'RIDER_PICKED_UP', payload.riderId)
      .catch((err: unknown) => this.logger.warn({ err }, '[rider-task.picked-up] sms failed (non-blocking)'));

    await this.auditLog.writeAudit({
      traceId: `rider-picked-up-${payload.riderTaskId}`,
      operatorType: 'rider',
      operatorId: payload.riderId,
      targetType: 'rider-task',
      targetId: payload.riderTaskId,
      afterStatus: 'PICKED_UP',
      summary: `骑手已取货`,
    });
  }
}
