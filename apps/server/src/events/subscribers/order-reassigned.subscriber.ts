import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type OrderReassignedPayload } from '../events';

@Injectable()
export class OrderReassignedSubscriber {
  private readonly logger = new Logger(OrderReassignedSubscriber.name);

  constructor(private readonly gateway: IntegrationGatewayService) {}

  @OnEvent(EventName.OrderReassigned)
  async handle(payload: OrderReassignedPayload): Promise<void> {
    this.logger.log(
      `[dispatch.order-reassigned] dispatchTaskId=${payload.dispatchTaskId} ${payload.oldRiderId ?? '-'}→${payload.newRiderId}`,
    );
    if (payload.oldRiderId) {
      await this.gateway.getui
        .pushOne({
          cid: `rider:${payload.oldRiderId}`,
          title: '订单已改派',
          body: '此订单已转给其他骑手',
          payload: { dispatchTaskId: payload.dispatchTaskId },
        })
        .catch((err: unknown) => this.logger.warn({ err }, '[order-reassigned] push old rider failed'));
    }
    await this.gateway.getui
      .pushOne({
        cid: `rider:${payload.newRiderId}`,
        title: '新派单',
        body: '管理员为您指派了新订单',
        payload: { dispatchTaskId: payload.dispatchTaskId },
      })
      .catch((err: unknown) => this.logger.warn({ err }, '[order-reassigned] push new rider failed'));
  }
}
