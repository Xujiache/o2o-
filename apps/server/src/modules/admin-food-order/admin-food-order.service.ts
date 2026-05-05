import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { FoodOrder, OrderTimeline, PaymentOrder } from '../../database/entities';

import {
  type AdminFoodOrderDetailVo,
  type AdminFoodOrderListPageVo,
  type AdminListFoodOrdersQueryDto,
  type AdminTimelineStatsVo,
} from './admin-food-order.dto';

@Injectable()
export class AdminFoodOrderService {
  constructor(
    @InjectRepository(FoodOrder) private readonly orderRepo: Repository<FoodOrder>,
    @InjectRepository(OrderTimeline) private readonly timelineRepo: Repository<OrderTimeline>,
    @InjectRepository(PaymentOrder) private readonly paymentRepo: Repository<PaymentOrder>,
  ) {}

  async list(query: AdminListFoodOrdersQueryDto): Promise<AdminFoodOrderListPageVo> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    let qb = this.orderRepo.createQueryBuilder('o').where('1=1');
    if (query.status) qb = qb.andWhere('o.status = :st', { st: query.status });
    if (query.cityCode) qb = qb.andWhere('o.city_code = :cc', { cc: query.cityCode });
    if (query.customerId) qb = qb.andWhere('o.customer_id = :cid', { cid: query.customerId });
    if (query.storeId) qb = qb.andWhere('o.store_id = :sid', { sid: query.storeId });
    if (query.payChannel) {
      qb = qb.andWhere(
        'EXISTS (SELECT 1 FROM payment_order p WHERE p.biz_type = :bt AND p.biz_id = o.food_order_id AND p.pay_channel = :pc)',
        { bt: 'FOOD', pc: query.payChannel },
      );
    }
    qb = qb.orderBy('o.created_at', 'DESC');
    const total = await qb.getCount();
    const orders = await qb
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getMany();
    return {
      pageNo,
      pageSize,
      total,
      list: orders.map((o) => ({
        orderId: o.foodOrderId,
        orderNo: o.orderNo,
        status: o.status,
        payStatus: o.payStatus,
        customerId: o.customerId,
        storeId: o.storeId,
        cityCode: o.cityCode,
        payableAmount: o.payableAmount,
        expireAt: Number(o.expireAt),
        createdAt: Number(o.createdAt),
      })),
    };
  }

  async detail(orderId: string): Promise<AdminFoodOrderDetailVo> {
    const order = await this.orderRepo.findOne({ where: { foodOrderId: orderId } });
    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'ORDER_NOT_FOUND',
        message: '订单不存在',
      });
    }
    const timelineRows = await this.timelineRepo.find({ where: { orderId } });
    timelineRows.sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
    const payment = await this.paymentRepo.findOne({ where: { bizType: 'FOOD', bizId: orderId } });
    return {
      orderId: order.foodOrderId,
      orderNo: order.orderNo,
      status: order.status,
      payStatus: order.payStatus,
      customerId: order.customerId,
      storeId: order.storeId,
      cityCode: order.cityCode,
      goodsAmount: order.goodsAmount,
      deliveryFee: order.deliveryFee,
      payableAmount: order.payableAmount,
      expireAt: Number(order.expireAt),
      paidAt: order.paidAt ? Number(order.paidAt) : null,
      cancelledAt: order.cancelledAt ? Number(order.cancelledAt) : null,
      cancelledBy: order.cancelledBy,
      cancelledReason: order.cancelledReason,
      // Stage 7 — 商家履约时间(扩展)
      acceptedAt: order.acceptedAt ? Number(order.acceptedAt) : null,
      expectedReadyAt: order.expectedReadyAt ? Number(order.expectedReadyAt) : null,
      readyAt: order.readyAt ? Number(order.readyAt) : null,
      rejectReason: order.rejectReason,
      createdAt: Number(order.createdAt),
      timeline: timelineRows.map((t) => ({
        fromStatus: t.fromStatus,
        toStatus: t.toStatus,
        actorType: t.actorType,
        reason: t.reason,
        createdAt: Number(t.createdAt),
      })),
      payment: payment
        ? {
            payOrderId: payment.paymentOrderId,
            payOrderNo: payment.payOrderNo,
            payChannel: payment.payChannel,
            status: payment.status,
            channelTradeNo: payment.channelTradeNo,
            paidAt: payment.paidAt ? Number(payment.paidAt) : null,
          }
        : null,
    };
  }

  async timelineStatistics(): Promise<AdminTimelineStatsVo> {
    const now = Date.now();
    const dayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    const waitPayOverdueCount = await this.orderRepo
      .createQueryBuilder('o')
      .where("o.status = 'WAIT_PAY' AND o.expire_at < :now", { now })
      .getCount();
    const merchantAcceptOverdueCount = await this.orderRepo
      .createQueryBuilder('o')
      .where("o.status = 'PAID_WAIT_MERCHANT' AND o.paid_at < :t", { t: now - 10 * 60 * 1000 })
      .getCount();
    const deliveringCount = await this.orderRepo
      .createQueryBuilder('o')
      .where("o.status IN ('PICKED_UP', 'DELIVERING')")
      .getCount();
    const completedTodayCount = await this.orderRepo
      .createQueryBuilder('o')
      .where("o.status = 'COMPLETED' AND o.updated_at >= :s", { s: dayStart })
      .getCount();
    const cancelledTodayCount = await this.orderRepo
      .createQueryBuilder('o')
      .where("o.status = 'CANCELLED' AND o.cancelled_at >= :s", { s: dayStart })
      .getCount();
    return {
      waitPayOverdueCount,
      merchantAcceptOverdueCount,
      deliveringCount,
      completedTodayCount,
      cancelledTodayCount,
    };
  }
}
