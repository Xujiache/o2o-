import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type RiderArrivedPickupPayload } from '../events';

@Injectable()
export class RiderArrivedPickupSubscriber {
  private readonly logger = new Logger(RiderArrivedPickupSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.RiderArrivedPickup)
  async handle(payload: RiderArrivedPickupPayload): Promise<void> {
    this.logger.log(`[rider-task.arrived-pickup] taskId=${payload.riderTaskId} rider=${payload.riderId}`);

    if (payload.bizType === 'FOOD') {
      await this.gateway.getui
        .pushOne({
          cid: `merchant:order:${payload.bizOrderId}`,
          title: '骑手已到店',
          body: `骑手已到取货点,请准备出餐`,
          payload: { riderTaskId: payload.riderTaskId, scene: 'arrived-pickup' },
        })
        .catch((err: unknown) => this.logger.warn({ err }, '[rider-task.arrived-pickup] push failed (non-blocking)'));
    }

    await this.auditLog.writeAudit({
      traceId: `rider-arrived-pickup-${payload.riderTaskId}`,
      operatorType: 'rider',
      operatorId: payload.riderId,
      targetType: 'rider-task',
      targetId: payload.riderTaskId,
      afterStatus: 'ARRIVED_PICKUP',
      summary: `骑手到达取货点`,
    });
  }
}
