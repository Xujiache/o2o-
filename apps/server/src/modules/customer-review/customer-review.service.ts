import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { FoodOrder, OrderReview, Store } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import type { SubmitReviewDto, SubmitReviewVo } from './customer-review.dto';

@Injectable()
export class CustomerReviewService {
  constructor(
    @InjectRepository(OrderReview) private readonly reviewRepo: Repository<OrderReview>,
    @InjectRepository(FoodOrder) private readonly orderRepo: Repository<FoodOrder>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    private readonly eventBus: DomainEventBus,
  ) {}

  async submit(customerId: string, dto: SubmitReviewDto): Promise<SubmitReviewVo> {
    const order = await this.orderRepo.findOne({ where: { foodOrderId: dto.orderId } });
    if (!order) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'order not found' });
    if (order.customerId !== customerId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'order not belong to customer' });
    }
    if (order.status !== 'COMPLETED') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `cannot review at status ${order.status}`,
      });
    }

    const existing = await this.reviewRepo.findOne({ where: { orderId: dto.orderId } });
    if (existing) {
      throw new BadRequestException({
        code: ErrorCode.DUPLICATE_REQUEST,
        message: 'order already reviewed',
      });
    }

    const store = await this.storeRepo.findOne({ where: { storeId: order.storeId } });
    if (!store) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'store not found' });

    const now = Date.now();
    const inserted = await this.reviewRepo.save(
      this.reviewRepo.create({
        orderId: dto.orderId,
        customerId,
        storeId: store.storeId,
        rating: dto.rating,
        content: dto.content ?? null,
        imageFileIds: dto.imageFileIds ?? null,
        anonymous: dto.anonymous ? 1 : 0,
        createdAt: String(now),
      }),
    );

    await this.eventBus.publish(
      EventName.OrderReviewSubmitted,
      {
        reviewId: inserted.orderReviewId,
        orderId: dto.orderId,
        storeId: store.storeId,
        merchantId: store.merchantId,
        customerId,
        rating: dto.rating,
        submittedAt: now,
      },
      { bizType: 'order-review', bizId: inserted.orderReviewId },
    );

    return { reviewId: inserted.orderReviewId, submittedAt: now };
  }
}
