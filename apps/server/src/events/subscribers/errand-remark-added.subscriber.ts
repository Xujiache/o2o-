import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type ErrandRemarkAddedPayload } from '../events';

@Injectable()
export class ErrandRemarkAddedSubscriber {
  private readonly logger = new Logger(ErrandRemarkAddedSubscriber.name);
  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.ErrandRemarkAdded)
  async handle(payload: ErrandRemarkAddedPayload): Promise<void> {
    this.logger.log(`[errand-order.remark-added] orderId=${payload.orderId} attachments=${payload.attachmentCount}`);

    await this.gateway.getui
      .pushOne({
        cid: 'rider:assigned',
        title: '订单新增备注',
        body: `订单 ${payload.orderId} 用户补充了备注`,
        payload: { orderId: payload.orderId, remark: payload.remark },
      })
      .catch((err: unknown) => this.logger.warn({ err }, '[errand-order.remark-added] push failed'));

    await this.auditLog.writeAudit({
      traceId: `errand-remark-${payload.orderId}-${payload.addedAt}`,
      operatorType: 'customer',
      operatorId: payload.customerId,
      targetType: 'errand-order',
      targetId: payload.orderId,
      summary: `订单 ${payload.orderId} 补充备注`,
    });
  }
}
