import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { EventName, type ManualDispatchCreatedPayload } from '../events';

@Injectable()
export class ManualDispatchCreatedSubscriber {
  private readonly logger = new Logger(ManualDispatchCreatedSubscriber.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(EventName.ManualDispatchCreated)
  async handle(payload: ManualDispatchCreatedPayload): Promise<void> {
    this.logger.log(
      `[dispatch.manual-created] dispatchTaskId=${payload.dispatchTaskId} riderId=${payload.riderId} by=${payload.operatorAdminId}`,
    );
    await this.auditLog.writeAudit({
      traceId: `manual-dispatch-${payload.dispatchTaskId}`,
      operatorType: 'admin',
      operatorId: payload.operatorAdminId,
      targetType: 'dispatch-task',
      targetId: payload.dispatchTaskId,
      afterStatus: 'DISPATCHED',
      summary: `人工派单 ${payload.dispatchTaskId} → 骑手 ${payload.riderId} 原因=${payload.reason ?? '-'}`,
    });
  }
}
