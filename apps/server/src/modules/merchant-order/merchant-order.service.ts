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

import { FoodOrder, MerchantOrderActionLog, OrderTimeline, Store } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import type {
  AcceptOrderDto,
  AcceptOrderVo,
  MerchantOrderListItemVo,
  MerchantOrderListVo,
  MerchantOrderTimelineVo,
  PendingListQueryDto,
  ReadyOrderDto,
  ReadyOrderVo,
  RejectOrderDto,
  RejectOrderVo,
} from './merchant-order.dto';

const MERCHANT_NEXT_ACTIONS: Record<string, string[]> = {
  PAID_WAIT_MERCHANT: ['ACCEPT', 'REJECT'],
  PREPARING: ['READY'],
};

const DEFAULT_EXPECTED_READY_MIN = 15;
const ACCEPT_DEADLINE_MS = 10 * 60 * 1000;

@Injectable()
export class MerchantOrderService {
  constructor(
    @InjectRepository(FoodOrder) private readonly orderRepo: Repository<FoodOrder>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(MerchantOrderActionLog)
    private readonly actionLogRepo: Repository<MerchantOrderActionLog>,
    @InjectRepository(OrderTimeline) private readonly timelineRepo: Repository<OrderTimeline>,
    private readonly eventBus: DomainEventBus,
  ) {}

  async getTimeline(merchantId: string, orderId: string): Promise<MerchantOrderTimelineVo> {
    const store = await this.resolveStoreOrThrow(merchantId);
    const order = await this.orderRepo.findOne({ where: { foodOrderId: orderId } });
    if (!order) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'order not found' });
    }
    if (order.storeId !== store.storeId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'not your store order' });
    }
    const rows = await this.timelineRepo.find({
      where: { orderId, bizType: 'FOOD' },
      order: { createdAt: 'ASC' },
    });
    return {
      timeline: rows.map((r) => ({
        at: Number(r.createdAt),
        fromStatus: r.fromStatus,
        toStatus: r.toStatus,
        actor: r.actorType,
        reason: r.reason,
      })),
      currentStatus: order.status,
      allowedMerchantActions: MERCHANT_NEXT_ACTIONS[order.status] ?? [],
    };
  }

  private async resolveStoreOrThrow(merchantId: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { merchantId } });
    if (!store) throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'merchant has no store' });
    return store;
  }

  async listPending(merchantId: string, query: PendingListQueryDto): Promise<MerchantOrderListVo> {
    const store = await this.resolveStoreOrThrow(merchantId);
    const pageNo = Math.max(1, query.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));

    const [rows, total] = await this.orderRepo.findAndCount({
      where: { storeId: store.storeId, status: 'PAID_WAIT_MERCHANT' },
      order: { createdAt: 'ASC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });

    const items: MerchantOrderListItemVo[] = rows.map((r) => ({
      orderId: r.foodOrderId,
      orderNo: r.orderNo,
      status: r.status,
      payableAmountCents: r.payableAmount,
      userRemark: r.remark,
      createdAt: Number(r.createdAt),
      acceptDeadline: Number(r.createdAt) + ACCEPT_DEADLINE_MS,
    }));

    return { items, total, pageNo, pageSize };
  }

  async accept(merchantId: string, orderId: string, dto: AcceptOrderDto): Promise<AcceptOrderVo> {
    const store = await this.resolveStoreOrThrow(merchantId);
    const order = await this.orderRepo.findOne({ where: { foodOrderId: orderId } });
    if (!order) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'order not found' });
    if (order.storeId !== store.storeId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'order not belong to merchant' });
    }
    if (order.status !== 'PAID_WAIT_MERCHANT') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `cannot accept at status ${order.status}`,
      });
    }

    const now = Date.now();
    const minutes = dto.expectedReadyMinutes ?? DEFAULT_EXPECTED_READY_MIN;
    const expectedReadyAt = now + minutes * 60 * 1000;

    order.status = 'PREPARING';
    order.acceptedAt = String(now);
    order.expectedReadyAt = String(expectedReadyAt);
    order.updatedAt = String(now);
    await this.orderRepo.save(order);

    await this.actionLogRepo.insert({
      orderId,
      merchantId,
      storeId: store.storeId,
      action: 'ACCEPT',
      beforeStatus: 'PAID_WAIT_MERCHANT',
      afterStatus: 'PREPARING',
      payloadJson: { expectedReadyAt, minutes },
      operatorId: merchantId,
      createdAt: String(now),
    });

    await this.eventBus.publish(
      EventName.MerchantOrderAccepted,
      {
        orderId,
        storeId: store.storeId,
        merchantId,
        expectedReadyAt,
        acceptedAt: now,
      },
      { bizType: 'food-order', bizId: orderId },
    );

    return { orderId, status: 'PREPARING', acceptedAt: now, expectedReadyAt };
  }

  async reject(merchantId: string, orderId: string, dto: RejectOrderDto): Promise<RejectOrderVo> {
    if (!dto.rejectReason || dto.rejectReason.trim().length === 0) {
      throw new BadRequestException({ code: ErrorCode.INVALID_PARAM, message: 'rejectReason required' });
    }
    const store = await this.resolveStoreOrThrow(merchantId);
    const order = await this.orderRepo.findOne({ where: { foodOrderId: orderId } });
    if (!order) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'order not found' });
    if (order.storeId !== store.storeId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'order not belong to merchant' });
    }
    if (order.status !== 'PAID_WAIT_MERCHANT') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `cannot reject at status ${order.status}`,
      });
    }

    const now = Date.now();
    order.status = 'CANCELLED';
    order.cancelledAt = String(now);
    order.cancelledBy = 'merchant';
    order.cancelledReason = dto.rejectReason;
    order.rejectReason = dto.rejectReason;
    order.payStatus = 'refunded';
    order.updatedAt = String(now);
    await this.orderRepo.save(order);

    await this.actionLogRepo.insert({
      orderId,
      merchantId,
      storeId: store.storeId,
      action: 'REJECT',
      beforeStatus: 'PAID_WAIT_MERCHANT',
      afterStatus: 'CANCELLED',
      payloadJson: { rejectReason: dto.rejectReason },
      operatorId: merchantId,
      createdAt: String(now),
    });

    await this.eventBus.publish(
      EventName.MerchantOrderRejected,
      {
        orderId,
        storeId: store.storeId,
        merchantId,
        rejectReason: dto.rejectReason,
        rejectedAt: now,
      },
      { bizType: 'food-order', bizId: orderId },
    );

    return { orderId, status: 'CANCELLED', refundStatus: 'REFUNDING' };
  }

  async ready(merchantId: string, orderId: string, dto: ReadyOrderDto): Promise<ReadyOrderVo> {
    const store = await this.resolveStoreOrThrow(merchantId);
    const order = await this.orderRepo.findOne({ where: { foodOrderId: orderId } });
    if (!order) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'order not found' });
    if (order.storeId !== store.storeId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'order not belong to merchant' });
    }
    if (order.status !== 'PREPARING') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `cannot mark ready at status ${order.status}`,
      });
    }

    const now = Date.now();
    order.status = 'READY_FOR_PICKUP';
    order.readyAt = String(now);
    order.updatedAt = String(now);
    await this.orderRepo.save(order);

    await this.actionLogRepo.insert({
      orderId,
      merchantId,
      storeId: store.storeId,
      action: 'READY',
      beforeStatus: 'PREPARING',
      afterStatus: 'READY_FOR_PICKUP',
      payloadJson: dto.readyRemark ? { readyRemark: dto.readyRemark } : null,
      operatorId: merchantId,
      createdAt: String(now),
    });

    await this.eventBus.publish(
      EventName.FoodReadyForPickup,
      {
        orderId,
        storeId: store.storeId,
        merchantId,
        readyAt: now,
      },
      { bizType: 'food-order', bizId: orderId },
    );

    return { orderId, status: 'READY_FOR_PICKUP', readyAt: now };
  }
}
