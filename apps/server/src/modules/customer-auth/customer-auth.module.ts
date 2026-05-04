import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerUser, LoginDevice } from '../../database/entities';
import { MessageSettingModule } from '../message-setting/message-setting.module';
import { SmsModule } from '../sms/sms.module';
import { UserProfileModule } from '../user-profile/user-profile.module';

import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthService } from './customer-auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerUser, LoginDevice]), SmsModule, UserProfileModule, MessageSettingModule],
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService],
  exports: [CustomerAuthService],
})
export class CustomerAuthModule {}
