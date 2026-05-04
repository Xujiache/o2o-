import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { In, Repository } from 'typeorm';

import { PERMISSION_META } from '../../../common/decorators/require-permission.decorator';
import { SysPermission, SysRole, SysRolePermission } from '../../../database/entities';
import type { CurrentPrincipal } from '../types';

/**
 * 权限守卫 — 必须在 ScopeJwtGuard 之后激活(req.user 已就位)。
 * 读取 @RequirePermission('code1','code2',...) 元数据,检查当前主体角色集合是否覆盖任一 code。
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(SysRole) private readonly roleRepo: Repository<SysRole>,
    @InjectRepository(SysPermission) private readonly permRepo: Repository<SysPermission>,
    @InjectRepository(SysRolePermission) private readonly rpRepo: Repository<SysRolePermission>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSION_META, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: CurrentPrincipal }>();
    const principal = req.user;
    if (!principal) throw new UnauthorizedException('login required');
    if (!principal.roles?.length) throw new ForbiddenException('no roles assigned');

    // 1. role codes -> role ids
    const roles = await this.roleRepo.find({ where: { code: In(principal.roles) } });
    if (roles.length === 0) throw new ForbiddenException('roles not found');
    const roleIds = roles.map((r) => r.id);

    // 2. role ids -> permission ids
    const bindings = await this.rpRepo.find({ where: { roleId: In(roleIds) } });
    if (bindings.length === 0) throw new ForbiddenException('no permissions bound');
    const permIds = bindings.map((b) => b.permissionId);

    // 3. perm ids -> codes,与 required 求交
    const perms = await this.permRepo.find({ where: { id: In(permIds), code: In(required) } });
    if (perms.length === 0) throw new ForbiddenException(`missing permission: ${required.join(' / ')}`);

    return true;
  }
}
