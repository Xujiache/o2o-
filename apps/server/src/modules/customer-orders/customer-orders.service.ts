import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { ErrandOrder, ErrandTimeline, FoodOrder, OrderTimeline } from '../../database/entities';

import type { CustomerOrderTimelineVo, OrderBizType, TimelineItemVo } from './customer-orders.dto';

@Injectable()
export class CustomerOrdersService {
  constructor(
    @InjectRepository(FoodOrder) private readonly foodOrderRepo: Repository<FoodOrder>,
    @InjectRepository(ErrandOrder) private readonly errandOrderRepo: Repository<ErrandOrder>,
    @InjectRepository(OrderTimeline) private readonly orderTimelineRepo: Repository<OrderTimeline>,
    @InjectRepository(ErrandTimeline) private readonly errandTimelineRepo: Repository<ErrandTimeline>,
  ) {}

  async getTimeline(customerId: string, bizType: OrderBizType, orderId: string): Promise<CustomerOrderTimelineVo> {
    if (bizType === 'FOOD') return this.getFoodTimeline(customerId, orderId);
    return this.getErrandTimeline(customerId, orderId);
  }

  private async getFoodTimeline(customerId: string, orderId: string): Promise<CustomerOrderTimelineVo> {
    const order = await this.foodOrderRepo.findOne({ where: { foodOrderId: orderId } });
    if (!order) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'order not found' });
    }
    if (order.customerId !== customerId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'not your order' });
    }
    const rows = await this.orderTimelineRepo.find({
      where: { orderId, bizType: 'FOOD' },
      order: { createdAt: 'ASC' },
    });
    const timeline: TimelineItemVo[] = rows.map((r) => ({
      at: Number(r.createdAt),
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      actor: r.actorType,
      reason: r.reason,
    }));
    return { timeline, currentStatus: order.status, availableActions: [] };
  }

  private async getErrandTimeline(customerId: string, orderId: string): Promise<CustomerOrderTimelineVo> {
    const order = await this.errandOrderRepo.findOne({ where: { errandOrderId: orderId } });
    if (!order) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'order not found' });
    }
    if (order.customerId !== customerId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'not your order' });
    }
    const rows = await this.errandTimelineRepo.find({
      where: { errandOrderId: orderId },
      order: { createdAt: 'ASC' },
    });
    const timeline: TimelineItemVo[] = rows.map((r) => ({
      at: Number(r.createdAt),
      fromStatus: null,
      toStatus: r.eventType,
      actor: r.operator,
      reason: null,
    }));
    return { timeline, currentStatus: order.status, availableActions: [] };
  }
}
