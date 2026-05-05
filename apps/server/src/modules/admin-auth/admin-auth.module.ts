import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminUser, SysPermission, SysRole, SysRolePermission } from '../../database/entities';
import { EventsModule } from '../../events/events.module';

import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUser, SysRole, SysPermission, SysRolePermission]), EventsModule],
  controllers: [AdminAuthController],
  providers: [AdminAuthService],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
