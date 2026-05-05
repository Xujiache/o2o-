import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaymentOrder } from '../../database/entities';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type ErrandNoRiderCancelledPayload } from '../events';

/**
 * 10 min 无骑手接单 → 自动取消 + 全额退款 mock(stage 6 不接真支付)
 */
@Injectable()
export class ErrandNoRiderCancelledSubscriber {
  private readonly logger = new Logger(ErrandNoRiderCancelledSubscriber.name);
  constructor(
    @InjectRepository(PaymentOrder) private readonly payRepo: Repository<PaymentOrder>,
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.ErrandNoRiderCancelled)
  async handle(payload: ErrandNoRiderCancelledPayload): Promise<void> {
    this.logger.log(`[errand-order.no-rider-cancelled] orderId=${payload.orderId} refund=${payload.refundAmount}`);

    // 退款 mock:把 payment_order 标记为 refunded
    if (payload.payOrderId) {
      const now = Date.now();
      await this.payRepo
        .update({ paymentOrderId: payload.payOrderId }, { status: 'refunded', updatedAt: String(now) })
        .catch((err: unknown) => this.logger.warn({ err }, '[errand-order.no-rider-cancelled] payment refund failed'));
    }

    // 短信通知用户
    await this.gateway.sms
      .send(payload.customerId, 'ORDER_REFUNDED', String(payload.orderId))
      .catch((err: unknown) => this.logger.warn({ err }, '[errand-order.no-rider-cancelled] sms failed'));

    await this.auditLog.writeAudit({
      traceId: `errand-no-rider-${payload.orderId}`,
      operatorType: 'system',
      operatorId: 'no-rider-cancel-job',
      targetType: 'errand-order',
      targetId: payload.orderId,
      afterStatus: 'CANCELLED',
      summary: `订单 ${payload.orderId} 10 分钟无骑手接单已取消并全额退款 ${payload.refundAmount} 分`,
    });
  }
}
