import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type ErrandPriceIncreasedPayload } from '../events';

@Injectable()
export class ErrandPriceIncreasedSubscriber {
  private readonly logger = new Logger(ErrandPriceIncreasedSubscriber.name);
  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.ErrandPriceIncreased)
  async handle(payload: ErrandPriceIncreasedPayload): Promise<void> {
    this.logger.log(
      `[errand-order.price-increased] orderId=${payload.orderId} ${payload.oldUrgentLevel}→${payload.newUrgentLevel}`,
    );

    // 推送骑手:加价提示(可能更受关注)
    await this.gateway.getui
      .pushOne({
        cid: 'rider:nearby',
        title: '订单加价',
        body: `订单 ${payload.orderId} 已加价至 ${payload.newUrgentLevel}`,
        payload: { orderId: payload.orderId, urgentLevel: payload.newUrgentLevel },
      })
      .catch((err: unknown) => this.logger.warn({ err }, '[errand-order.price-increased] push failed'));

    await this.auditLog.writeAudit({
      traceId: `errand-price-inc-${payload.orderId}`,
      operatorType: payload.source === 'customer' ? 'customer' : 'system',
      operatorId: payload.customerId,
      targetType: 'errand-order',
      targetId: payload.orderId,
      summary: `订单加急 ${payload.oldUrgentLevel}→${payload.newUrgentLevel} 应付 ${payload.oldPayable}→${payload.newPayable}`,
    });
  }
}
