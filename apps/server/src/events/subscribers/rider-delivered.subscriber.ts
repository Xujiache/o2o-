import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type RiderDeliveredPayload } from '../events';

@Injectable()
export class RiderDeliveredSubscriber {
  private readonly logger = new Logger(RiderDeliveredSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.RiderDelivered)
  async handle(payload: RiderDeliveredPayload): Promise<void> {
    this.logger.log(`[rider-task.delivered] taskId=${payload.riderTaskId}`);

    await this.gateway.sms
      .send(payload.bizOrderId, 'ORDER_DELIVERED', payload.riderId)
      .catch((err: unknown) => this.logger.warn({ err }, '[rider-task.delivered] sms failed (non-blocking)'));

    await this.auditLog.writeAudit({
      traceId: `rider-delivered-${payload.riderTaskId}`,
      operatorType: 'rider',
      operatorId: payload.riderId,
      targetType: 'rider-task',
      targetId: payload.riderTaskId,
      afterStatus: 'DELIVERED',
      summary: `骑手已送达 ${payload.bizType} ${payload.bizOrderId}`,
    });
  }
}
