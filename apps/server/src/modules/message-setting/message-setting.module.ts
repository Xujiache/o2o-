import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MessageSetting } from '../../database/entities';

import { MessageSettingService } from './message-setting.service';

@Module({
  imports: [TypeOrmModule.forFeature([MessageSetting])],
  providers: [MessageSettingService],
  exports: [MessageSettingService],
})
export class MessageSettingModule {}
