import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminUser, SysPermission, SysRole, SysRolePermission } from '../../database/entities';
import { EventsModule } from '../../events/events.module';

import { AdminRolePermissionController } from './admin-role-permission.controller';
import { AdminRolePermissionService } from './admin-role-permission.service';

@Module({
  imports: [TypeOrmModule.forFeature([SysRole, SysPermission, SysRolePermission, AdminUser]), EventsModule],
  controllers: [AdminRolePermissionController],
  providers: [AdminRolePermissionService],
  exports: [AdminRolePermissionService],
})
export class AdminRolePermissionModule {}
