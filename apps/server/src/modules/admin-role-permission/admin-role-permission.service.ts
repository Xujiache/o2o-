import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { DataSource, In, Repository } from 'typeorm';

import { AdminUser, SysPermission, SysRole, SysRolePermission } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import {
  PermissionGroupVo,
  PermissionTreeVo,
  RoleItemVo,
  RoleListVo,
  UpdateRolePermissionsVo,
} from './admin-role-permission.dto';

const PROTECTED_ROLE_CODES = new Set(['SUPER_ADMIN', 'AUDITOR']);

@Injectable()
export class AdminRolePermissionService {
  constructor(
    @InjectRepository(SysRole) private readonly roleRepo: Repository<SysRole>,
    @InjectRepository(SysPermission) private readonly permRepo: Repository<SysPermission>,
    @InjectRepository(SysRolePermission) private readonly rpRepo: Repository<SysRolePermission>,
    @InjectRepository(AdminUser) private readonly adminRepo: Repository<AdminUser>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly eventBus: DomainEventBus,
  ) {}

  async listRoles(): Promise<RoleListVo> {
    const roles = await this.roleRepo.find({ order: { code: 'ASC' } });
    if (!roles.length) return { list: [] };
    const allBindings = await this.rpRepo.find({ where: { roleId: In(roles.map((r) => r.id)) } });
    const allPerms = allBindings.length
      ? await this.permRepo.find({ where: { id: In(allBindings.map((b) => b.permissionId)) } })
      : [];
    const permCodeById = new Map(allPerms.map((p) => [p.id, p.code]));

    const list: RoleItemVo[] = roles.map((r) => ({
      roleId: r.id,
      code: r.code,
      name: r.name,
      scope: r.scope,
      enabled: r.enabled === 1,
      permissionCodes: allBindings
        .filter((b) => b.roleId === r.id)
        .map((b) => permCodeById.get(b.permissionId) ?? '')
        .filter((c) => c !== ''),
    }));
    return { list };
  }

  async listPermissionTree(): Promise<PermissionTreeVo> {
    const perms = await this.permRepo.find({ order: { sort: 'ASC', code: 'ASC' } });
    const groups: Record<string, PermissionGroupVo> = {};
    for (const p of perms) {
      if (!groups[p.scope]) {
        groups[p.scope] = { group: p.scope, permissions: [] };
      }
      groups[p.scope]!.permissions.push({
        code: p.code,
        name: p.name,
        type: p.type,
        scope: p.scope,
        parentCode: p.parentCode,
      });
    }
    return { groups: Object.values(groups) };
  }

  async updateRolePermissions(
    roleId: string,
    permissionCodes: string[],
    operatorAdminId: string,
  ): Promise<UpdateRolePermissionsVo> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('role not found');

    // 内置角色不允许清空全部权限
    if (PROTECTED_ROLE_CODES.has(role.code) && permissionCodes.length === 0) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '不允许清空内置角色权限',
      });
    }

    // 校验权限码全部存在
    const perms = permissionCodes.length ? await this.permRepo.find({ where: { code: In(permissionCodes) } }) : [];
    if (perms.length !== permissionCodes.length) {
      const validCodes = new Set(perms.map((p) => p.code));
      const invalid = permissionCodes.filter((c) => !validCodes.has(c));
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'PERMISSION_CODE_UNKNOWN',
        message: `权限点不存在:${invalid.join(',')}`,
      });
    }

    const existingBindings = await this.rpRepo.find({ where: { roleId } });
    const oldPermIds = new Set(existingBindings.map((b) => b.permissionId));
    const newPermIds = new Set(perms.map((p) => p.id));
    const oldPermCodes = await this.resolveCodes(Array.from(oldPermIds));

    const now = String(Date.now());
    await this.ds.transaction(async (em) => {
      // 删旧
      if (existingBindings.length) {
        await em.delete(SysRolePermission, { roleId });
      }
      // 写新
      if (perms.length) {
        await em.insert(
          SysRolePermission,
          perms.map((p) => ({ roleId, permissionId: p.id, createdAt: now })),
        );
      }
    });

    const affectedAdmins = await this.adminRepo
      .createQueryBuilder('a')
      .where('JSON_CONTAINS(a.role_codes, JSON_QUOTE(:rc))', { rc: role.code })
      .getCount()
      .catch(() => 0);

    await this.eventBus.publish(
      EventName.RoleChanged,
      {
        roleId: role.id,
        roleCode: role.code,
        oldPermissionCodes: oldPermCodes,
        newPermissionCodes: permissionCodes,
        operatorAdminId,
        changedAt: Number(now),
      },
      { bizType: 'sys-role', bizId: role.id },
    );

    void newPermIds; // 预留供后续 diff 用
    return {
      roleId: role.id,
      appliedCodes: permissionCodes,
      affectedAdminUsers: affectedAdmins,
      updatedAt: now,
    };
  }

  private async resolveCodes(permIds: string[]): Promise<string[]> {
    if (!permIds.length) return [];
    const rows = await this.permRepo.find({ where: { id: In(permIds) } });
    return rows.map((r) => r.code);
  }
}
