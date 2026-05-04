import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SysPermission, SysRole, SysRolePermission } from '../../database/entities';

/**
 * 全局共享 sys_role / sys_permission / sys_role_permission 仓储,
 * 让 PermissionGuard 能在任意 controller 模块内被实例化。
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SysRole, SysPermission, SysRolePermission])],
  exports: [TypeOrmModule],
})
export class AuthEntitiesModule {}
