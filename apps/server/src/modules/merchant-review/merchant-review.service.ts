import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { OrderReview, ReviewReply, Store } from '../../database/entities';

import type { ReplyReviewDto, ReplyReviewVo } from './merchant-review.dto';

@Injectable()
export class MerchantReviewService {
  constructor(
    @InjectRepository(ReviewReply) private readonly replyRepo: Repository<ReviewReply>,
    @InjectRepository(OrderReview) private readonly reviewRepo: Repository<OrderReview>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
  ) {}

  private async resolveStoreOrThrow(merchantId: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { merchantId } });
    if (!store) throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'merchant has no store' });
    return store;
  }

  async reply(merchantId: string, reviewId: string, dto: ReplyReviewDto): Promise<ReplyReviewVo> {
    const store = await this.resolveStoreOrThrow(merchantId);
    const review = await this.reviewRepo.findOne({ where: { orderReviewId: reviewId } });
    if (!review) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'review not found' });
    if (review.storeId !== store.storeId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'not your review' });
    }

    const existing = await this.replyRepo.findOne({ where: { orderReviewId: reviewId } });
    if (existing) {
      throw new BadRequestException({
        code: ErrorCode.DUPLICATE_REQUEST,
        message: 'review already replied',
      });
    }

    const now = Date.now();
    const inserted = await this.replyRepo.save(
      this.replyRepo.create({
        orderReviewId: reviewId,
        merchantId,
        storeId: store.storeId,
        content: dto.content,
        createdAt: String(now),
      }),
    );

    return {
      reviewReplyId: inserted.reviewReplyId,
      orderReviewId: reviewId,
      createdAt: now,
    };
  }
}
