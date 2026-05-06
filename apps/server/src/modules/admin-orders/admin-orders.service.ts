import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import {
  DispatchTask,
  ErrandOrder,
  ErrandTimeline,
  FoodOrder,
  ManualDispatchLog,
  OrderTimeline,
  PaymentOrder,
  SysAuditLog,
} from '../../database/entities';

import type { AdminOrderTimelineVo } from './admin-orders.dto';

@Injectable()
export class AdminOrdersService {
  constructor(
    @InjectRepository(FoodOrder) private readonly foodOrderRepo: Repository<FoodOrder>,
    @InjectRepository(ErrandOrder) private readonly errandOrderRepo: Repository<ErrandOrder>,
    @InjectRepository(OrderTimeline) private readonly orderTimelineRepo: Repository<OrderTimeline>,
    @InjectRepository(ErrandTimeline) private readonly errandTimelineRepo: Repository<ErrandTimeline>,
    @InjectRepository(SysAuditLog) private readonly auditRepo: Repository<SysAuditLog>,
    @InjectRepository(DispatchTask) private readonly dispatchRepo: Repository<DispatchTask>,
    @InjectRepository(ManualDispatchLog) private readonly manualDispatchRepo: Repository<ManualDispatchLog>,
    @InjectRepository(PaymentOrder) private readonly paymentRepo: Repository<PaymentOrder>,
  ) {}

  async getTimeline(bizType: 'FOOD' | 'ERRAND', orderId: string): Promise<AdminOrderTimelineVo> {
    const currentStatus = await this.resolveCurrentStatus(bizType, orderId);
    const timeline = await this.loadTimeline(bizType, orderId);
    const operatorLogs = await this.loadOperatorLogs(bizType, orderId);
    const dispatchLogs = await this.loadDispatchLogs(bizType, orderId);
    const paymentLogs = await this.loadPaymentLogs(bizType, orderId);
    return { timeline, currentStatus, operatorLogs, dispatchLogs, paymentLogs };
  }

  private async resolveCurrentStatus(bizType: 'FOOD' | 'ERRAND', orderId: string): Promise<string> {
    if (bizType === 'FOOD') {
      const o = await this.foodOrderRepo.findOne({ where: { foodOrderId: orderId } });
      if (!o) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'order not found' });
      return o.status;
    }
    const o = await this.errandOrderRepo.findOne({ where: { errandOrderId: orderId } });
    if (!o) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'order not found' });
    return o.status;
  }

  private async loadTimeline(bizType: 'FOOD' | 'ERRAND', orderId: string) {
    if (bizType === 'FOOD') {
      const rows = await this.orderTimelineRepo.find({
        where: { orderId, bizType: 'FOOD' },
        order: { createdAt: 'ASC' },
      });
      return rows.map((r) => ({
        at: Number(r.createdAt),
        fromStatus: r.fromStatus,
        toStatus: r.toStatus,
        actor: r.actorType,
        reason: r.reason,
      }));
    }
    const rows = await this.errandTimelineRepo.find({
      where: { errandOrderId: orderId },
      order: { createdAt: 'ASC' },
    });
    return rows.map((r) => ({
      at: Number(r.createdAt),
      fromStatus: null,
      toStatus: r.eventType,
      actor: r.operator,
      reason: null,
    }));
  }

  private async loadOperatorLogs(bizType: 'FOOD' | 'ERRAND', orderId: string) {
    const targetType = bizType === 'FOOD' ? 'food-order' : 'errand-order';
    const rows = await this.auditRepo.find({
      where: { targetType, targetId: orderId },
      order: { createdAt: 'ASC' },
      take: 200,
    });
    return rows.map((r) => ({
      at: Number(r.createdAt),
      operatorType: r.operatorType,
      operatorId: r.operatorId,
      beforeStatus: r.beforeStatus,
      afterStatus: r.afterStatus,
      summary: r.summary,
    }));
  }

  private async loadDispatchLogs(bizType: 'FOOD' | 'ERRAND', orderId: string) {
    const tasks = await this.dispatchRepo.find({ where: { bizType, bizOrderId: orderId } });
    if (tasks.length === 0) return [];
    const taskIds = tasks.map((t) => t.dispatchTaskId);
    const logs = await this.manualDispatchRepo
      .createQueryBuilder('m')
      .where('m.dispatchTaskId IN (:...ids)', { ids: taskIds })
      .orderBy('m.createdAt', 'ASC')
      .getMany();
    return logs.map((m) => ({
      at: Number(m.createdAt),
      dispatchTaskId: m.dispatchTaskId,
      riderId: m.riderId,
      operatorAdminId: m.operatorAdminId,
      beforeStatus: m.beforeStatus,
      afterStatus: m.afterStatus,
      reason: m.reason,
    }));
  }

  private async loadPaymentLogs(bizType: 'FOOD' | 'ERRAND', orderId: string) {
    const rows = await this.paymentRepo.find({ where: { bizType, bizId: orderId }, order: { createdAt: 'ASC' } });
    return rows.map((p) => ({
      payOrderId: p.paymentOrderId,
      payOrderNo: p.payOrderNo,
      channel: p.payChannel,
      status: p.status,
      paidAmount: p.paidAmount,
      paidAt: p.paidAt ? Number(p.paidAt) : null,
      channelTradeNo: p.channelTradeNo,
    }));
  }
}
