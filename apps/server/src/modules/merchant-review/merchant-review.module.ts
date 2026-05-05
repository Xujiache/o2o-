import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrderReview, ReviewReply, Store } from '../../database/entities';

import { MerchantReviewController } from './merchant-review.controller';
import { MerchantReviewService } from './merchant-review.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewReply, OrderReview, Store])],
  controllers: [MerchantReviewController],
  providers: [MerchantReviewService],
  exports: [MerchantReviewService],
})
export class MerchantReviewModule {}
