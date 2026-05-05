import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type Redis from 'ioredis';

import { REDIS_CLIENT } from '../../config/redis.module';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { type AccountDisabledPayload, EventName } from '../events';

const ACCOUNT_REVOKED_TTL_SECONDS = 7 * 24 * 3600;

/**
 * AccountDisabledSubscriber:用户/商家/骑手账号禁用启用流水通用订阅器(stage 4 通用 AccountDisabled 事件)。
 * - disable:在 Redis 写 `<scope>:account-revoked:<accountId>` 标记 + 审计日志
 * - enable:仅审计日志(老 token 已被 disable 流程吊销,enable 后用户需重新登录)
 *
 * 注:实际 token 吊销由对应端的 auth.service.revokeAllDevices 在 service 层同步执行(双保险幂等)。
 */
@Injectable()
export class AccountDisabledSubscriber {
  private readonly logger = new Logger(AccountDisabledSubscriber.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly auditLog: AuditLogService,
  ) {}

  @OnEvent(EventName.AccountDisabled)
  async handle(payload: AccountDisabledPayload): Promise<void> {
    if (payload.action === 'disable') {
      const key = `${payload.accountType}:account-revoked:${payload.accountId}`;
      await this.redis.set(key, String(payload.operatedAt), 'EX', ACCOUNT_REVOKED_TTL_SECONDS).catch(() => undefined);
    }

    this.logger.log(
      `[account.${payload.action}] type=${payload.accountType} id=${payload.accountId} operator=${payload.operatorAdminId}`,
    );

    await this.auditLog.writeAudit({
      traceId: `account-${payload.action}-${payload.accountType}-${payload.accountId}-${payload.operatedAt}`,
      operatorType: 'admin',
      operatorId: payload.operatorAdminId,
      targetType: `${payload.accountType}-account`,
      targetId: payload.accountId,
      beforeStatus: payload.action === 'disable' ? 'active' : 'disabled',
      afterStatus: payload.action === 'disable' ? 'disabled' : 'active',
      summary: `${payload.accountType} ${payload.accountId} ${payload.action}: ${payload.reason ?? '-'}`,
    });
  }
}
