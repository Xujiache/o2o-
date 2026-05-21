import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ErrandOrder } from '../../database/entities/errand-order.entity';
import { FoodOrder } from '../../database/entities/food-order.entity';
import { RiderTask } from '../../database/entities/rider-task.entity';
import {
  type DispatchStartedPayload,
  type ErrandOrderCreatedPayload,
  type ErrandPaidPayload,
  EventName,
  type FoodOrderCreatedPayload,
  type FoodOrderPaidPayload,
  type FoodReadyForPickupPayload,
  type RefundExecutedPayload,
  type RiderArrivedPickupPayload,
  type RiderDeliveredPayload,
  type RiderLocationUpdatedPayload,
  type RiderPickedUpPayload,
  type RiderTaskAcceptedPayload,
} from '../../events/events';

import { TopicBuilder } from './ws-topic.util';
import { WsGateway } from './ws.gateway';

/**
 * DomainEvent → WS topic 桥接。
 *
 * 设计原则:
 *   - 所有处理 best-effort,失败不抛(不阻塞业务流)
 *   - 优先用 payload 携带的字段;缺字段时反查 RiderTask / FoodOrder / ErrandOrder
 *   - 用 `setImmediate` 让 emit 不阻塞业务 emitAsync
 */
@Injectable()
export class WsEventBridgeService {
  private readonly logger = new Logger(WsEventBridgeService.name);

  constructor(
    private readonly ws: WsGateway,
    @InjectRepository(FoodOrder) private readonly foodOrderRepo: Repository<FoodOrder>,
    @InjectRepository(ErrandOrder) private readonly errandOrderRepo: Repository<ErrandOrder>,
    @InjectRepository(RiderTask) private readonly riderTaskRepo: Repository<RiderTask>,
  ) {}

  // === 外卖订单 ===

  @OnEvent(EventName.FoodOrderCreated)
  onFoodOrderCreated(p: FoodOrderCreatedPayload): void {
    this.safe(() => {
      this.ws.emitToTopic(TopicBuilder.merchantStore(p.storeId), 'order.new', {
        orderId: p.orderId,
        orderNo: p.orderNo,
        payableAmount: p.payableAmount,
      });
    });
  }

  @OnEvent(EventName.FoodOrderPaid)
  onFoodOrderPaid(p: FoodOrderPaidPayload): void {
    this.safe(() => {
      this.ws.emitToTopics(
        [TopicBuilder.merchantStore(p.storeId), TopicBuilder.customerOrder(p.orderId)],
        'order.paid',
        { orderId: p.orderId, paidAmount: p.paidAmount, paidAt: p.paidAt },
      );
    });
  }

  @OnEvent(EventName.FoodReadyForPickup)
  async onFoodReadyForPickup(p: FoodReadyForPickupPayload): Promise<void> {
    try {
      const order = await this.foodOrderRepo
        .findOne({ where: { foodOrderId: p.orderId }, select: ['cityCode'] })
        .catch(() => null);
      const topics = [TopicBuilder.customerOrder(p.orderId)];
      if (order?.cityCode) topics.push(TopicBuilder.riderHall(order.cityCode));
      this.ws.emitToTopics(topics, 'order.ready', {
        orderId: p.orderId,
        storeId: p.storeId,
        readyAt: p.readyAt,
      });
    } catch (err) {
      this.logger.warn(`[ws-bridge] FoodReadyForPickup failed: ${(err as Error).message}`);
    }
  }

  // === Order 完成(W1 待新增的 OrderCompleted 事件)===
  //
  // 当前 EventName 尚未定义 OrderCompleted;用字符串监听以兼容上游引入。
  // 一旦上游正式发布该事件即自动桥接,无需修改本桥。
  @OnEvent('domain.order.completed')
  onOrderCompleted(p: { orderId: string; storeId?: string; bizType?: string }): void {
    this.safe(() => {
      const topics = [TopicBuilder.customerOrder(p.orderId)];
      if (p.storeId) topics.push(TopicBuilder.merchantStore(p.storeId));
      this.ws.emitToTopics(topics, 'order.completed', p);
    });
  }

  // === 派单 ===

  @OnEvent(EventName.DispatchStarted)
  async onDispatchStarted(p: DispatchStartedPayload): Promise<void> {
    try {
      const cityCode = await this.lookupCityCode(p.bizType, p.bizOrderId);
      const topics: string[] = [TopicBuilder.adminDispatch()];
      if (cityCode) topics.push(TopicBuilder.riderHall(cityCode));
      this.ws.emitToTopics(topics, 'dispatch.new', {
        dispatchTaskId: p.dispatchTaskId,
        bizType: p.bizType,
        bizOrderId: p.bizOrderId,
        candidateRiderIds: p.candidateRiderIds,
      });
    } catch (err) {
      this.logger.warn(`[ws-bridge] DispatchStarted failed: ${(err as Error).message}`);
    }
  }

  @OnEvent(EventName.RiderTaskAccepted)
  async onRiderTaskAccepted(p: RiderTaskAcceptedPayload): Promise<void> {
    this.safe(() => {
      this.ws.emitToTopics([TopicBuilder.customerOrder(p.bizOrderId), TopicBuilder.adminDispatch()], 'task.assigned', {
        riderTaskId: p.riderTaskId,
        dispatchTaskId: p.dispatchTaskId,
        riderId: p.riderId,
        bizType: p.bizType,
        bizOrderId: p.bizOrderId,
        acceptedAt: p.acceptedAt,
      });
    });
  }

  @OnEvent(EventName.RiderArrivedPickup)
  onRiderArrivedPickup(p: RiderArrivedPickupPayload): void {
    this.safe(() => {
      this.ws.emitToTopic(TopicBuilder.customerOrder(p.bizOrderId), 'task.arrived_pickup', {
        riderTaskId: p.riderTaskId,
        riderId: p.riderId,
        arrivedAt: p.arrivedAt,
      });
    });
  }

  @OnEvent(EventName.RiderPickedUp)
  onRiderPickedUp(p: RiderPickedUpPayload): void {
    this.safe(() => {
      this.ws.emitToTopic(TopicBuilder.customerOrder(p.bizOrderId), 'task.picked_up', {
        riderTaskId: p.riderTaskId,
        riderId: p.riderId,
        pickedUpAt: p.pickedUpAt,
      });
    });
  }

  @OnEvent(EventName.RiderDelivered)
  onRiderDelivered(p: RiderDeliveredPayload): void {
    this.safe(() => {
      this.ws.emitToTopic(TopicBuilder.customerOrder(p.bizOrderId), 'task.delivered', {
        riderTaskId: p.riderTaskId,
        riderId: p.riderId,
        deliveredAt: p.deliveredAt,
      });
    });
  }

  // === 退款 ===

  @OnEvent(EventName.RefundExecuted)
  onRefundExecuted(p: RefundExecutedPayload): void {
    this.safe(() => {
      // bizOrderId 即客户订单 id(食物 / 跑腿 / 生鲜)
      this.ws.emitToTopic(TopicBuilder.customerOrder(p.bizOrderId), 'refund.executed', {
        refundOrderId: p.refundOrderId,
        refundNo: p.refundNo,
        bizType: p.bizType,
        amount: p.amount,
        status: p.status,
      });
    });
  }

  // === 骑手位置 ===

  @OnEvent(EventName.RiderLocationUpdated)
  async onRiderLocationUpdated(p: RiderLocationUpdatedPayload): Promise<void> {
    try {
      // 拉取该骑手 in-progress 的 rider-task,推送到对应客户订单 topic
      const tasks = await this.riderTaskRepo
        .find({
          where: [
            { riderId: p.riderId, status: 'ASSIGNED' },
            { riderId: p.riderId, status: 'ARRIVED_PICKUP' },
            { riderId: p.riderId, status: 'PICKED_UP' },
            { riderId: p.riderId, status: 'DELIVERING' },
          ],
          select: ['riderTaskId', 'bizOrderId'],
        })
        .catch(() => []);
      if (tasks.length === 0) return;
      const data = {
        riderId: p.riderId,
        lng: p.lastLng,
        lat: p.lastLat,
        reportedAt: p.lastReportedAt,
      };
      const topics = tasks.map((t) => TopicBuilder.customerOrder(t.bizOrderId));
      this.ws.emitToTopics(topics, 'rider.location', data);
    } catch (err) {
      this.logger.warn(`[ws-bridge] RiderLocationUpdated failed: ${(err as Error).message}`);
    }
  }

  // === 跑腿 ===

  @OnEvent(EventName.ErrandPaid)
  async onErrandPaid(p: ErrandPaidPayload): Promise<void> {
    await this.broadcastErrandNew(p.orderId, 'errand.new');
  }

  @OnEvent(EventName.ErrandOrderCreated)
  async onErrandOrderCreated(p: ErrandOrderCreatedPayload): Promise<void> {
    // 创建时未支付,通常推不到 hall;仅推 admin dispatch 用于监控
    this.safe(() => {
      this.ws.emitToTopic(TopicBuilder.adminDispatch(), 'errand.new', {
        orderId: p.orderId,
        orderNo: p.orderNo,
        typeCode: p.typeCode,
        payableAmount: p.payableAmount,
      });
    });
  }

  private async broadcastErrandNew(errandOrderId: string, type: string): Promise<void> {
    try {
      // errand-order 没有 cityCode 字段(规划保留);此处只推 admin:dispatch + rider hall 用通配兜底
      const topics: string[] = [TopicBuilder.adminDispatch()];
      // TODO(@ws-gateway):errand-order 增加 cityCode 字段后,在此 lookup 并 push 同城 hall
      this.ws.emitToTopics(topics, type, { orderId: errandOrderId });
    } catch (err) {
      this.logger.warn(`[ws-bridge] broadcastErrandNew failed: ${(err as Error).message}`);
    }
  }

  // === 辅助:从 bizOrderId 反查 cityCode ===

  private async lookupCityCode(bizType: 'FOOD' | 'ERRAND', bizOrderId: string): Promise<string | null> {
    if (bizType === 'FOOD') {
      const order = await this.foodOrderRepo
        .findOne({ where: { foodOrderId: bizOrderId }, select: ['cityCode'] })
        .catch(() => null);
      return order?.cityCode ?? null;
    }
    // errand-order 当前无 cityCode 字段
    return null;
  }

  private safe(fn: () => void): void {
    try {
      fn();
    } catch (err) {
      this.logger.warn(`[ws-bridge] emit failed: ${(err as Error).message}`);
    }
  }
}
