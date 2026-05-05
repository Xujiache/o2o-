import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FoodOrder, OrderReview, Store } from '../../database/entities';

import { CustomerReviewController } from './customer-review.controller';
import { CustomerReviewService } from './customer-review.service';

@Module({
  imports: [TypeOrmModule.forFeature([OrderReview, FoodOrder, Store])],
  controllers: [CustomerReviewController],
  providers: [CustomerReviewService],
  exports: [CustomerReviewService],
})
export class CustomerReviewModule {}
