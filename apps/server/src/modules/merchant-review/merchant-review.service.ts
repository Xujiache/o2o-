import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { In, Repository } from 'typeorm';

import { FoodOrder, OrderReview, ReviewReply, Store } from '../../database/entities';
import { FileService } from '../file/file.service';

import type {
  ReplyReviewDto,
  ReplyReviewVo,
  ReviewListItemVo,
  ReviewListQueryDto,
  ReviewListVo,
} from './merchant-review.dto';

@Injectable()
export class MerchantReviewService {
  constructor(
    @InjectRepository(ReviewReply) private readonly replyRepo: Repository<ReviewReply>,
    @InjectRepository(OrderReview) private readonly reviewRepo: Repository<OrderReview>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(FoodOrder) private readonly foodOrderRepo: Repository<FoodOrder>,
    private readonly fileService: FileService,
  ) {}

  private async resolveStoreOrThrow(merchantId: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { merchantId } });
    if (!store) throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'merchant has no store' });
    return store;
  }

  async list(merchantId: string, dto: ReviewListQueryDto): Promise<ReviewListVo> {
    const store = await this.resolveStoreOrThrow(merchantId);
    const pageNo = dto.pageNo ?? 1;
    const pageSize = dto.pageSize ?? 20;
    const filter = dto.filter ?? 'all';

    const qb = this.reviewRepo.createQueryBuilder('r').where('r.store_id = :storeId', { storeId: store.storeId });
    if (dto.rating) qb.andWhere('r.rating = :rating', { rating: dto.rating });
    qb.orderBy('r.created_at', 'DESC');

    if (filter !== 'all') {
      // 用子查询过滤已/未回复
      const op = filter === 'replied' ? 'IN' : 'NOT IN';
      qb.andWhere(`r.order_review_id ${op} (SELECT order_review_id FROM review_reply WHERE store_id = :storeId2)`, {
        storeId2: store.storeId,
      });
    }

    const total = await qb.getCount();
    const rows = await qb
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const reviewIds = rows.map((r) => r.orderReviewId);
    const orderIds = rows.map((r) => r.orderId);

    // 一次性查回复 / 订单号 / 所有图片 url
    const [replies, orders] = await Promise.all([
      reviewIds.length === 0
        ? Promise.resolve([] as ReviewReply[])
        : this.replyRepo.find({ where: { orderReviewId: In(reviewIds) } }),
      orderIds.length === 0
        ? Promise.resolve([] as FoodOrder[])
        : this.foodOrderRepo.find({ where: { foodOrderId: In(orderIds) } }),
    ]);

    const replyMap = new Map(replies.map((rp) => [rp.orderReviewId, rp]));
    const orderMap = new Map(orders.map((o) => [o.foodOrderId, o]));

    // 批量解析所有图片 fileId
    const allFileIds = rows.flatMap((r) => r.imageFileIds ?? []);
    const urlMap = await this.fileService.resolveUrls(allFileIds);

    const list: ReviewListItemVo[] = rows.map((r) => {
      const reply = replyMap.get(r.orderReviewId) ?? null;
      const order = orderMap.get(r.orderId);
      const images = (r.imageFileIds ?? []).map((id) => urlMap[id]).filter((u): u is string => Boolean(u));
      const cid = r.customerId;
      const tail = cid.length >= 4 ? cid.slice(-4) : cid;
      const label = r.anonymous ? `匿名用户` : `用户${tail}`;
      return {
        orderReviewId: r.orderReviewId,
        orderId: r.orderId,
        orderNo: order?.orderNo ?? '',
        rating: r.rating,
        content: r.content,
        images,
        customerLabel: label,
        anonymous: Boolean(r.anonymous),
        createdAt: Number(r.createdAt),
        reply: reply
          ? {
              reviewReplyId: reply.reviewReplyId,
              content: reply.content,
              createdAt: Number(reply.createdAt),
            }
          : null,
      };
    });

    // 同步计算未回复数与平均分(全部范围,不受 filter/rating 影响)
    const [unrepliedCount, avgRow] = await Promise.all([
      this.reviewRepo
        .createQueryBuilder('r2')
        .where('r2.store_id = :sid', { sid: store.storeId })
        .andWhere('r2.order_review_id NOT IN (SELECT order_review_id FROM review_reply WHERE store_id = :sid2)', {
          sid2: store.storeId,
        })
        .getCount(),
      this.reviewRepo
        .createQueryBuilder('r3')
        .select('AVG(r3.rating)', 'avg')
        .where('r3.store_id = :sid', { sid: store.storeId })
        .getRawOne<{ avg: string | null }>(),
    ]);

    return {
      pageNo,
      pageSize,
      total,
      unrepliedCount,
      avgRating: avgRow?.avg ? Number(avgRow.avg).toFixed(2) : '0.00',
      list,
    };
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
