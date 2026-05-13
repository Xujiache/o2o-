import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Store } from '../../database/entities';
import { FileModule } from '../file/file.module';

import { StoreQueryController } from './store-query.controller';
import { StoreQueryService } from './store-query.service';

@Module({
  imports: [TypeOrmModule.forFeature([Store]), FileModule],
  controllers: [StoreQueryController],
  providers: [StoreQueryService],
  exports: [StoreQueryService],
})
export class StoreQueryModule {}
