import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { ErrandOrder, ErrandOrderDetail, ErrandTask, ErrandTimeline } from '../../database/entities';

@Injectable()
export class ErrandDispatchService {
  constructor(
    @InjectRepository(ErrandOrder) private readonly orderRepo: Repository<ErrandOrder>,
    @InjectRepository(ErrandTask) private readonly taskRepo: Repository<ErrandTask>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 创建调度任务并把订单推进到 DISPATCHING。
   * - 幂等:同一 orderId 已有 task 直接返(避免重复创建)
   * - 适用场景:支付成功 / 预约到点
   */
  async createTask(orderId: string, source: 'paid' | 'reserved' = 'paid'): Promise<ErrandTask> {
    const existing = await this.taskRepo.findOne({ where: { errandOrderId: orderId } });
    if (existing) return existing;

    const order = await this.orderRepo.findOne({ where: { errandOrderId: orderId } });
    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'ERRAND_ORDER_NOT_FOUND',
        message: '跑腿订单不存在',
      });
    }
    // 必须 PAID 状态(支付完成或预约触发后已经先 PAID)
    if (order.status !== 'PAID' && order.status !== 'DISPATCHING') {
      throw new NotFoundException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'ERRAND_ORDER_NOT_PAID',
        message: `跑腿订单状态不是 PAID/DISPATCHING(当前 ${order.status})`,
      });
    }

    const detail = await this.dataSource
      .getRepository(ErrandOrderDetail)
      .findOne({ where: { errandOrderId: orderId } });

    const now = Date.now();
    let task: ErrandTask | null = null;
    await this.dataSource.transaction(async (em: EntityManager) => {
      const ins = await em.getRepository(ErrandTask).insert({
        errandOrderId: orderId,
        status: 'READY_FOR_DISPATCH',
        riderId: null,
        dispatchCount: 0,
        priceIncrease: '0',
        pickupAddress: detail?.pickupAddress ?? null,
        deliveryAddress: detail?.deliveryAddress ?? {
          address: '(empty)',
        },
        distanceMeters: detail?.distanceMeters ?? 0,
        lastDispatchedAt: null,
        createdAt: String(now),
        updatedAt: String(now),
      });
      const taskId = String(ins.identifiers[0]?.errandTaskId ?? '');
      task = (await em.getRepository(ErrandTask).findOne({ where: { errandTaskId: taskId } }))!;

      if (order.status !== 'DISPATCHING') {
        await em
          .getRepository(ErrandOrder)
          .update(
            { errandOrderId: orderId },
            { status: 'DISPATCHING', dispatchingAt: String(now), updatedAt: String(now) },
          );
        await em.getRepository(ErrandTimeline).insert({
          errandOrderId: orderId,
          eventType: 'DISPATCHING',
          payload: { source, taskId },
          operator: 'system',
          createdAt: String(now),
        });
      }
    });
    return task!;
  }
}
