import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PushDevice } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';

import { PushDeviceController } from './push-device.controller';
import { PushDeviceService } from './push-device.service';

@Module({
  imports: [TypeOrmModule.forFeature([PushDevice]), AuthModule],
  controllers: [PushDeviceController],
  providers: [PushDeviceService],
  exports: [PushDeviceService],
})
export class PushDeviceModule {}
