import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ErrandOrder, ErrandTimeline, FoodOrder, OrderTimeline } from '../../database/entities';

import { CustomerOrdersController } from './customer-orders.controller';
import { CustomerOrdersService } from './customer-orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([FoodOrder, ErrandOrder, OrderTimeline, ErrandTimeline])],
  controllers: [CustomerOrdersController],
  providers: [CustomerOrdersService],
  exports: [CustomerOrdersService],
})
export class CustomerOrdersModule {}
