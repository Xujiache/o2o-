import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { EventName, type StockReleasedPayload } from '../events';

@Injectable()
export class StockReleasedSubscriber {
  private readonly logger = new Logger(StockReleasedSubscriber.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(EventName.StockReleased)
  async handle(payload: StockReleasedPayload): Promise<void> {
    const totalQty = payload.items.reduce((acc, x) => acc + x.quantity, 0);
    this.logger.log(
      `[stock.released] orderId=${payload.orderId} reason=${payload.reason} items=${payload.items.length} totalQty=${totalQty}`,
    );
    await this.auditLog.writeAudit({
      traceId: `stock-released-${payload.orderId}-${payload.releasedAt}`,
      operatorType: 'system',
      operatorId: 'food-order',
      targetType: 'stock-lock',
      targetId: payload.orderId,
      afterStatus: 'released',
      summary: `订单 ${payload.orderId} 释放 ${payload.items.length} 个 sku 共 ${totalQty} 件库存(${payload.reason})`,
    });
  }
}
