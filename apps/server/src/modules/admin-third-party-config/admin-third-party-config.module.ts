import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ThirdPartyConfig } from '../../database/entities';
import { EventsModule } from '../../events/events.module';

import { AdminThirdPartyConfigController } from './admin-third-party-config.controller';
import { AdminThirdPartyConfigService } from './admin-third-party-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([ThirdPartyConfig]), EventsModule],
  controllers: [AdminThirdPartyConfigController],
  providers: [AdminThirdPartyConfigService],
  exports: [AdminThirdPartyConfigService],
})
export class AdminThirdPartyConfigModule {}
