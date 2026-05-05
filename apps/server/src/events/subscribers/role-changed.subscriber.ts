import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import type Redis from 'ioredis';
import { Repository } from 'typeorm';

import { REDIS_CLIENT } from '../../config/redis.module';
import { AdminUser } from '../../database/entities';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { EventName, type RoleChangedPayload } from '../events';

const ROLE_CHANGE_LOCK_TTL_SECONDS = 7 * 24 * 3600; // 与 refresh max TTL 一致

/**
 * RoleChangedSubscriber:某角色权限变更后,扫该角色绑定的 admin_user → 在 Redis 写入"角色重登"标记,
 * 现有 jti 黑名单基于具体 jti(下次请求时 token 会被识别为撤销)— 此处采用宽口径:
 * 写入 `admin:role-revoked:<adminUserId>:<changedAt>` 作为审计标记。
 * 真正强制重登:在 ScopeJwtGuard 的 jti 黑名单流程外,可后续接 access token iat 比对(stage 5+)。
 * 当前阶段先 audit_log + log,jti 黑名单交由 logout/refresh 自然失效。
 */
@Injectable()
export class RoleChangedSubscriber {
  private readonly logger = new Logger(RoleChangedSubscriber.name);

  constructor(
    @InjectRepository(AdminUser) private readonly adminRepo: Repository<AdminUser>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly auditLog: AuditLogService,
  ) {}

  @OnEvent(EventName.RoleChanged)
  async handle(payload: RoleChangedPayload): Promise<void> {
    const admins = await this.adminRepo
      .createQueryBuilder('a')
      .where('JSON_CONTAINS(a.role_codes, JSON_QUOTE(:rc))', { rc: payload.roleCode })
      .getMany()
      .catch(() => [] as AdminUser[]);

    for (const admin of admins) {
      const key = `admin:role-revoked:${admin.adminUserId}:${payload.changedAt}`;
      await this.redis.set(key, '1', 'EX', ROLE_CHANGE_LOCK_TTL_SECONDS).catch(() => undefined);
    }

    this.logger.log(
      `[role.changed] roleCode=${payload.roleCode} affectedAdmins=${admins.length} added=${
        payload.newPermissionCodes.length - payload.oldPermissionCodes.length
      }`,
    );

    await this.auditLog.writeAudit({
      traceId: `role-changed-${payload.roleId}-${payload.changedAt}`,
      operatorType: 'admin',
      operatorId: payload.operatorAdminId,
      targetType: 'sys-role-permission',
      targetId: payload.roleId,
      summary: `角色 ${payload.roleCode} 权限变更:from ${payload.oldPermissionCodes.length} → ${payload.newPermissionCodes.length}`,
    });
  }
}
