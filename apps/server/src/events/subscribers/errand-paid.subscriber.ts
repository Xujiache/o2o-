import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { ErrandDispatchService } from '../../modules/errand-dispatch/errand-dispatch.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type ErrandPaidPayload } from '../events';

/**
 * 跑腿订单支付成功后:
 *  1. dispatch.createTask(orderId) → 创 errand_task READY_FOR_DISPATCH + order DISPATCHING
 *  2. getui 推骑手广播(mock)
 *  3. sms 通知用户(mock)
 *  4. audit_log
 */
@Injectable()
export class ErrandPaidSubscriber {
  private readonly logger = new Logger(ErrandPaidSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
    private readonly dispatch: ErrandDispatchService,
  ) {}

  @OnEvent(EventName.ErrandPaid)
  async handle(payload: ErrandPaidPayload): Promise<void> {
    this.logger.log(`[errand-order.paid] orderId=${payload.orderId} customer=${payload.customerId}`);

    // 1. 创任务 + 推进状态(吞掉异常,主流程不阻塞)
    try {
      await this.dispatch.createTask(payload.orderId, 'paid');
    } catch (err: unknown) {
      this.logger.warn(
        { err },
        `[errand-order.paid] dispatch.createTask failed (non-blocking) orderId=${payload.orderId}`,
      );
    }

    // 2. push 骑手广播
    await this.gateway.getui
      .pushOne({
        cid: 'rider:nearby',
        title: '新跑腿任务',
        body: `跑腿订单 ${payload.orderId} 等待接单`,
        payload: { orderId: payload.orderId, paidAmount: payload.paidAmount },
      })
      .catch((err: unknown) => this.logger.warn({ err }, '[errand-order.paid] getui push failed (non-blocking)'));

    // 3. sms 用户
    await this.gateway.sms
      .send(payload.customerId, 'ORDER_PAID', String(payload.orderId))
      .catch((err: unknown) => this.logger.warn({ err }, '[errand-order.paid] sms send failed (non-blocking)'));

    await this.auditLog.writeAudit({
      traceId: `errand-order-paid-${payload.orderId}`,
      operatorType: 'system',
      operatorId: 'callback',
      targetType: 'errand-order',
      targetId: payload.orderId,
      afterStatus: 'DISPATCHING',
      summary: `跑腿订单 ${payload.orderId} 支付成功,已建调度任务`,
    });
  }
}
