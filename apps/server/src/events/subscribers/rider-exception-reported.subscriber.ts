import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type RiderExceptionReportedPayload } from '../events';

@Injectable()
export class RiderExceptionReportedSubscriber {
  private readonly logger = new Logger(RiderExceptionReportedSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.RiderExceptionReported)
  async handle(payload: RiderExceptionReportedPayload): Promise<void> {
    this.logger.warn(
      `[rider-task.exception-reported] violationId=${payload.riderViolationId} type=${payload.exceptionType}`,
    );

    await this.gateway.getui
      .pushOne({
        cid: 'admin:duty',
        title: '骑手异常报备',
        body: `${payload.exceptionType}: ${payload.description}`,
        payload: { violationId: payload.riderViolationId, riderTaskId: payload.riderTaskId, scene: 'exception' },
      })
      .catch((err: unknown) => this.logger.warn({ err }, '[rider-task.exception-reported] push failed (non-blocking)'));

    await this.auditLog.writeAudit({
      traceId: `rider-exception-${payload.riderViolationId}`,
      operatorType: 'rider',
      operatorId: payload.riderId,
      targetType: 'rider-violation',
      targetId: payload.riderViolationId,
      afterStatus: 'PENDING_PLATFORM',
      summary: `骑手报异常 ${payload.exceptionType}: ${payload.description}`,
    });
  }
}
