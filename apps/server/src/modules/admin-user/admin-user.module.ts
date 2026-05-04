import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerProfile, CustomerUser, LoginDevice, RealnameRecord, RiskUserTag } from '../../database/entities';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';

import { AdminUserController } from './admin-user.controller';
import { AdminUserService } from './admin-user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerUser, CustomerProfile, LoginDevice, RealnameRecord, RiskUserTag]),
    CustomerAuthModule,
  ],
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService],
})
export class AdminUserModule {}
