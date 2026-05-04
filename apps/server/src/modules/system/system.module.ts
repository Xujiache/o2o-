import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SysDict, ThirdPartyConfig } from '../../database/entities';

import { AdminIntegrationController, PublicCityController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [TypeOrmModule.forFeature([SysDict, ThirdPartyConfig])],
  controllers: [PublicCityController, AdminIntegrationController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
