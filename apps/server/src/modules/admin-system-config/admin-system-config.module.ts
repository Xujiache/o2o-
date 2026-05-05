import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SysConfig } from '../../database/entities';
import { EventsModule } from '../../events/events.module';

import { AdminSystemConfigController } from './admin-system-config.controller';
import { AdminSystemConfigService } from './admin-system-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([SysConfig]), EventsModule],
  controllers: [AdminSystemConfigController],
  providers: [AdminSystemConfigService],
  exports: [AdminSystemConfigService],
})
export class AdminSystemConfigModule {}
