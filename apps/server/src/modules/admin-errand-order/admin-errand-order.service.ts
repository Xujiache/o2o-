import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { ErrandOrder, ErrandOrderDetail, ErrandTask, ErrandTimeline } from '../../database/entities';

import type {
  AdminErrandOrderDetailVo,
  AdminErrandOrderListItemVo,
  AdminErrandOrderListPageVo,
  AdminErrandStatsVo,
  AdminListErrandOrdersQueryDto,
} from './admin-errand-order.dto';

@Injectable()
export class AdminErrandOrderService {
  constructor(
    @InjectRepository(ErrandOrder) private readonly orderRepo: Repository<ErrandOrder>,
    @InjectRepository(ErrandOrderDetail)
    private readonly detailRepo: Repository<ErrandOrderDetail>,
    @InjectRepository(ErrandTimeline)
    private readonly timelineRepo: Repository<ErrandTimeline>,
    @InjectRepository(ErrandTask) private readonly taskRepo: Repository<ErrandTask>,
  ) {}

  async list(q: AdminListErrandOrdersQueryDto): Promise<AdminErrandOrderListPageVo> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 10;
    const qb = this.orderRepo.createQueryBuilder('o').orderBy('o.created_at', 'DESC');
    if (q.status) qb.andWhere('o.status = :s', { s: q.status });
    if (q.customerId) qb.andWhere('o.customer_id = :cid', { cid: q.customerId });
    if (q.typeCode) qb.andWhere('o.type_code = :t', { t: q.typeCode });

    const total = await qb.getCount();
    const rows = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();
    const list: AdminErrandOrderListItemVo[] = rows.map((r) => this.toListItem(r));
    return { list, total, page, pageSize };
  }

  async detail(orderId: string): Promise<AdminErrandOrderDetailVo> {
    const order = await this.orderRepo.findOne({ where: { errandOrderId: orderId } });
    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'ERRAND_ORDER_NOT_FOUND',
        message: '订单不存在',
      });
    }
    const detail = await this.detailRepo.findOne({ where: { errandOrderId: orderId } });
    const timelineRows = await this.timelineRepo.find({
      where: { errandOrderId: orderId },
      order: { createdAt: 'ASC' },
    });
    const task = await this.taskRepo.findOne({ where: { errandOrderId: orderId } });

    return {
      ...this.toListItem(order),
      pickupAddress: (detail?.pickupAddress ?? null) as Record<string, unknown> | null,
      deliveryAddress: (detail?.deliveryAddress ?? {}) as Record<string, unknown>,
      itemDesc: detail?.itemDesc ?? null,
      taskDesc: detail?.taskDesc ?? null,
      weight: detail?.weight ?? null,
      distanceMeters: detail?.distanceMeters ?? 0,
      baseFee: order.baseFee,
      distanceFee: order.distanceFee,
      urgentFee: order.urgentFee,
      reservedTime: order.reservedTime != null ? Number(order.reservedTime) : null,
      payOrderId: order.payOrderId,
      cancelReason: order.cancelReason,
      timeline: timelineRows.map((t) => ({
        eventType: t.eventType,
        operator: t.operator,
        payload: t.payload,
        createdAt: Number(t.createdAt),
      })),
      task: task
        ? {
            taskId: task.errandTaskId,
            riderId: task.riderId,
            status: task.status,
            dispatchCount: task.dispatchCount,
            priceIncrease: task.priceIncrease,
          }
        : null,
    };
  }

  async stats(): Promise<AdminErrandStatsVo> {
    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(1)', 'count')
      .addSelect('COALESCE(SUM(o.payable_amount), 0)', 'amount')
      .groupBy('o.status')
      .getRawMany<{ status: string; count: string; amount: string }>();
    const map: Record<string, number> = {};
    let totalCount = 0;
    let totalAmount = 0n;
    for (const r of rows) {
      map[r.status] = Number(r.count);
      totalCount += Number(r.count);
      totalAmount += BigInt(r.amount ?? '0');
    }
    return {
      totalCount,
      waitPayCount: map.WAIT_PAY ?? 0,
      paidCount: map.PAID ?? 0,
      dispatchingCount: map.DISPATCHING ?? 0,
      assignedCount: map.ASSIGNED ?? 0,
      deliveredCount: map.DELIVERED ?? 0,
      completedCount: map.COMPLETED ?? 0,
      cancelledCount: map.CANCELLED ?? 0,
      totalAmount: totalAmount.toString(),
    };
  }

  private toListItem(o: ErrandOrder): AdminErrandOrderListItemVo {
    return {
      orderId: o.errandOrderId,
      orderNo: o.orderNo,
      customerId: o.customerId,
      typeCode: o.typeCode,
      status: o.status,
      payableAmount: o.payableAmount,
      urgentLevel: o.urgentLevel,
      createdAt: Number(o.createdAt),
      paidAt: o.paidAt != null ? Number(o.paidAt) : null,
      cancelledAt: o.cancelledAt != null ? Number(o.cancelledAt) : null,
    };
  }
}
