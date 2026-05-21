import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, LessThanOrEqual, Repository } from 'typeorm';

import { ErrandOrder, ErrandTimeline, FoodOrder, OrderTimeline } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const AUTO_COMPLETE_DELAY_MS = 30 * 60 * 1000; // 30 分钟
const SCAN_LIMIT = 200;

/**
 * DELIVERED → COMPLETED 自动完结 job。
 * 每分钟扫一次,把 30 分钟前已送达的订单结掉,触发 OrderCompleted 事件
 * (下游订阅器:T+1 结算、骑手收益生成、用户可评价 etc.)。
 */
@Injectable()
export class OrderAutoCompleteJob extends BaseJob {
  readonly name = 'order-auto-complete';
  protected override lockTtlMs = 60_000;

  constructor(
    @InjectRepository(FoodOrder) private readonly foodOrderRepo: Repository<FoodOrder>,
    @InjectRepository(ErrandOrder) private readonly errandOrderRepo: Repository<ErrandOrder>,
    private readonly dataSource: DataSource,
    private readonly eventBus: DomainEventBus,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 */1 * * * *', { name: 'order-auto-complete' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = Date.now();
    const threshold = now - AUTO_COMPLETE_DELAY_MS;

    await this.completeFoodOrders(threshold, now);
    await this.completeErrandOrders(threshold, now);
  }

  private async completeFoodOrders(threshold: number, now: number): Promise<void> {
    const rows = await this.foodOrderRepo.find({
      where: { status: 'DELIVERED', completedAt: LessThanOrEqual(String(threshold)) },
      take: SCAN_LIMIT,
    });
    if (!rows.length) {
      this.logger.debug('[order-auto-complete] no food orders to complete');
      return;
    }
    this.logger.log(`[order-auto-complete] completing ${rows.length} food orders`);

    for (const order of rows) {
      try {
        await this.dataSource.transaction(async (em: EntityManager) => {
          const updateRes = await em
            .getRepository(FoodOrder)
            .createQueryBuilder()
            .update()
            .set({ status: 'COMPLETED', completedAt: String(now), updatedAt: String(now) })
            .where('food_order_id = :id AND status = :st', { id: order.foodOrderId, st: 'DELIVERED' })
            .execute();
          if (!updateRes.affected) {
            this.logger.debug(`[order-auto-complete] food ${order.foodOrderId} already moved, skip`);
            return;
          }
          await em.getRepository(OrderTimeline).insert({
            orderId: order.foodOrderId,
            bizType: 'FOOD',
            fromStatus: 'DELIVERED',
            toStatus: 'COMPLETED',
            actorType: 'system',
            actorId: 'order-auto-complete',
            reason: 'AUTO_COMPLETE_30MIN',
            createdAt: String(now),
          });
        });

        await this.eventBus.publish(
          EventName.OrderCompleted,
          { orderId: order.foodOrderId, bizType: 'FOOD', completedAt: now, storeId: order.storeId },
          { bizType: 'food-order', bizId: order.foodOrderId },
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[order-auto-complete] food failed orderId=${order.foodOrderId}: ${msg}`);
      }
    }
  }

  private async completeErrandOrders(threshold: number, now: number): Promise<void> {
    const rows = await this.errandOrderRepo.find({
      where: { status: 'DELIVERED', completedAt: LessThanOrEqual(String(threshold)) },
      take: SCAN_LIMIT,
    });
    if (!rows.length) {
      this.logger.debug('[order-auto-complete] no errand orders to complete');
      return;
    }
    this.logger.log(`[order-auto-complete] completing ${rows.length} errand orders`);

    for (const order of rows) {
      try {
        await this.dataSource.transaction(async (em: EntityManager) => {
          const updateRes = await em
            .getRepository(ErrandOrder)
            .createQueryBuilder()
            .update()
            .set({ status: 'COMPLETED', completedAt: String(now), updatedAt: String(now) })
            .where('errand_order_id = :id AND status = :st', { id: order.errandOrderId, st: 'DELIVERED' })
            .execute();
          if (!updateRes.affected) {
            this.logger.debug(`[order-auto-complete] errand ${order.errandOrderId} already moved, skip`);
            return;
          }
          await em.getRepository(ErrandTimeline).insert({
            errandOrderId: order.errandOrderId,
            eventType: 'COMPLETED',
            payload: { reason: 'AUTO_COMPLETE_30MIN' },
            operator: 'system',
            createdAt: String(now),
          });
        });

        await this.eventBus.publish(
          EventName.OrderCompleted,
          { orderId: order.errandOrderId, bizType: 'ERRAND', completedAt: now },
          { bizType: 'errand-order', bizId: order.errandOrderId },
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[order-auto-complete] errand failed orderId=${order.errandOrderId}: ${msg}`);
      }
    }
  }
}
