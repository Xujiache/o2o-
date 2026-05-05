import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { EventName, type ThirdPartyConfigChangedPayload } from '../events';

@Injectable()
export class ThirdPartyConfigChangedSubscriber {
  private readonly logger = new Logger(ThirdPartyConfigChangedSubscriber.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(EventName.ThirdPartyConfigChanged)
  async handle(payload: ThirdPartyConfigChangedPayload): Promise<void> {
    this.logger.log(
      `[thirdparty.config-changed] provider=${payload.provider} fields=[${payload.changedFields.join(',')}] operator=${payload.operatorAdminId}`,
    );
    await this.auditLog.writeAudit({
      traceId: `tp-config-${payload.provider}-${payload.changedAt}`,
      operatorType: 'admin',
      operatorId: payload.operatorAdminId,
      targetType: 'third-party-config',
      targetId: payload.provider,
      summary: `第三方配置 ${payload.provider} 变更字段:${payload.changedFields.join(',')}`,
    });
    // stage 8+ 真接入时此处触发 IntegrationGatewayService.reloadConfig(provider)
  }
}
