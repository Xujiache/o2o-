import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MerchantAccount } from '../../database/entities';
import { SmsModule } from '../sms/sms.module';

import { MerchantAuthController } from './merchant-auth.controller';
import { MerchantAuthService } from './merchant-auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantAccount]), SmsModule],
  controllers: [MerchantAuthController],
  providers: [MerchantAuthService],
  exports: [MerchantAuthService],
})
export class MerchantAuthModule {}
