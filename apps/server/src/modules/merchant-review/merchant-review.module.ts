import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FoodOrder, OrderReview, ReviewReply, Store } from '../../database/entities';
import { FileModule } from '../file/file.module';

import { MerchantReviewController } from './merchant-review.controller';
import { MerchantReviewService } from './merchant-review.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewReply, OrderReview, Store, FoodOrder]), FileModule],
  controllers: [MerchantReviewController],
  providers: [MerchantReviewService],
  exports: [MerchantReviewService],
})
export class MerchantReviewModule {}
