import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ErrandTimeline, OrderTimeline } from '../../database/entities';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type RefundExecutedPayload } from '../events';

/**
 * 退款执行完成订阅器:
 *  1. audit_log(targetType=refund, operatorType=system)
 *  2. sms.send(customer 退款到账)— mock,真模式由 W2 接 ali-sms
 *  3. getui.pushOne(customer)— mock,真模式由 W2 接
 *  4. 写一条订单 timeline / errand timeline(REFUNDED)— 仅当 SUCCESS
 */
@Injectable()
export class RefundExecutedSubscriber {
  private readonly logger = new Logger(RefundExecutedSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
    @InjectRepository(OrderTimeline) private readonly orderTimelineRepo: Repository<OrderTimeline>,
    @InjectRepository(ErrandTimeline) private readonly errandTimelineRepo: Repository<ErrandTimeline>,
  ) {}

  @OnEvent(EventName.RefundExecuted)
  async handle(payload: RefundExecutedPayload): Promise<void> {
    this.logger.log(
      `[refund.executed] refundOrderId=${payload.refundOrderId} bizType=${payload.bizType} bizOrderId=${payload.bizOrderId} amount=${payload.amount} status=${payload.status}`,
    );

    // 1. audit log(无论成功失败)
    await this.auditLog.writeAudit({
      traceId: `refund-${payload.refundOrderId}`,
      operatorType: 'system',
      operatorId: 'refund',
      targetType: 'refund-order',
      targetId: payload.refundOrderId,
      afterStatus: payload.status,
      summary: `退款 ${payload.refundNo} ${payload.bizType}/${payload.bizOrderId} 金额=${payload.amount} ${payload.status}`,
    });

    // 2. sms 通知客户(mock — bizOrderId 当作占位 mobile)
    await this.gateway.sms
      .send(payload.bizOrderId, 'REFUND_EXECUTED', payload.refundNo)
      .catch((err: unknown) => this.logger.warn({ err }, '[refund.executed] sms send failed (non-blocking)'));

    // 3. 推送客户
    await this.gateway.getui
      .pushOne({
        cid: `customer:${payload.bizOrderId}`,
        title: payload.status === 'SUCCESS' ? '退款到账' : '退款失败',
        body:
          payload.status === 'SUCCESS'
            ? `订单 ${payload.bizOrderId} 退款 ${payload.amount} 已到账`
            : `订单 ${payload.bizOrderId} 退款 ${payload.amount} 失败,请联系客服`,
        payload: {
          refundOrderId: payload.refundOrderId,
          refundNo: payload.refundNo,
          bizType: payload.bizType,
          bizOrderId: payload.bizOrderId,
          amount: payload.amount,
          status: payload.status,
        },
      })
      .catch((err: unknown) => this.logger.warn({ err }, '[refund.executed] getui push failed (non-blocking)'));

    // 4. 写 timeline — 仅 SUCCESS 才写"退款到账"
    if (payload.status === 'SUCCESS') {
      try {
        if (payload.bizType === 'ERRAND') {
          await this.errandTimelineRepo.insert({
            errandOrderId: payload.bizOrderId,
            eventType: 'REFUNDED',
            payload: {
              refundOrderId: payload.refundOrderId,
              refundNo: payload.refundNo,
              amount: payload.amount,
            },
            operator: 'system',
            createdAt: String(payload.executedAt),
          });
        } else if (payload.bizType === 'FOOD') {
          // OrderTimeline 仅承载 FOOD 状态枚举,REFUNDED 复用 from/to 字段
          await this.orderTimelineRepo.insert({
            orderId: payload.bizOrderId,
            bizType: 'FOOD',
            fromStatus: null,
            toStatus: 'REFUNDED',
            actorType: 'system',
            actorId: 'refund',
            reason: `退款到账 ${payload.refundNo} 金额=${payload.amount}`,
            createdAt: String(payload.executedAt),
          });
        }
        // GROCERY 无 timeline 表,跳过(由 grocery 模块自管)
      } catch (err: unknown) {
        this.logger.warn({ err }, '[refund.executed] timeline insert failed (non-blocking)');
      }
    }
  }
}
