import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import {
  DispatchTask,
  ErrandOrder,
  ErrandTask,
  ErrandTimeline,
  FoodOrder,
  OrderTimeline,
  RiderTask,
  RiderViolation,
} from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { DispatchService } from '../dispatch/dispatch.service';

import type {
  AcceptTaskDto,
  AcceptTaskVo,
  ArrivePickupDto,
  ArrivePickupVo,
  DeliveredDto,
  DeliveredVo,
  ExceptionDto,
  ExceptionVo,
  PickupDto,
  PickupVo,
  RiderTaskDetailVo,
  RiderTaskTimelineVo,
} from './rider-task.dto';

const RIDER_NEXT_ACTIONS: Record<string, string[]> = {
  ASSIGNED: ['ARRIVED_PICKUP'],
  ARRIVED_PICKUP: ['PICKED_UP'],
  PICKED_UP: ['DELIVERED'],
};

@Injectable()
export class RiderTaskService {
  private readonly logger = new Logger(RiderTaskService.name);

  constructor(
    @InjectRepository(RiderTask) private readonly taskRepo: Repository<RiderTask>,
    @InjectRepository(DispatchTask) private readonly dispatchRepo: Repository<DispatchTask>,
    @InjectRepository(FoodOrder) private readonly foodOrderRepo: Repository<FoodOrder>,
    @InjectRepository(ErrandOrder) private readonly errandOrderRepo: Repository<ErrandOrder>,
    @InjectRepository(ErrandTask) private readonly errandTaskRepo: Repository<ErrandTask>,
    @InjectRepository(RiderViolation) private readonly violationRepo: Repository<RiderViolation>,
    @InjectRepository(OrderTimeline) private readonly orderTimelineRepo: Repository<OrderTimeline>,
    @InjectRepository(ErrandTimeline) private readonly errandTimelineRepo: Repository<ErrandTimeline>,
    private readonly dispatchService: DispatchService,
    private readonly eventBus: DomainEventBus,
  ) {}

  async getTimeline(riderId: string, riderTaskId: string): Promise<RiderTaskTimelineVo> {
    const task = await this.taskRepo.findOne({ where: { riderTaskId } });
    if (!task) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'task not found' });
    if (task.riderId !== riderId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'not your task' });
    }
    if (task.bizType === 'FOOD') {
      const rows = await this.orderTimelineRepo.find({
        where: { orderId: task.bizOrderId, bizType: 'FOOD' },
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
        taskStatus: task.status,
        orderBizType: 'FOOD',
        allowedRiderActions: RIDER_NEXT_ACTIONS[task.status] ?? [],
      };
    }
    const rows = await this.errandTimelineRepo.find({
      where: { errandOrderId: task.bizOrderId },
      order: { createdAt: 'ASC' },
    });
    return {
      timeline: rows.map((r) => ({
        at: Number(r.createdAt),
        fromStatus: null,
        toStatus: r.eventType,
        actor: r.operator,
        reason: null,
      })),
      taskStatus: task.status,
      orderBizType: 'ERRAND',
      allowedRiderActions: RIDER_NEXT_ACTIONS[task.status] ?? [],
    };
  }

  async detail(riderId: string, riderTaskId: string): Promise<RiderTaskDetailVo> {
    const task = await this.taskRepo.findOne({ where: { riderTaskId } });
    if (!task) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'task not found' });
    if (task.riderId !== riderId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'not your task' });
    }
    return this.toDetailVo(task);
  }

  /** 当前进行中任务(ASSIGNED/ARRIVED_PICKUP/PICKED_UP),最新一条(兼容旧 my-current 单任务页面) */
  async myCurrent(riderId: string): Promise<RiderTaskDetailVo | null> {
    const task = await this.taskRepo
      .createQueryBuilder('t')
      .where('t.rider_id = :riderId', { riderId })
      .andWhere("t.status IN ('ASSIGNED','ARRIVED_PICKUP','PICKED_UP')")
      .orderBy('t.accepted_at', 'DESC')
      .limit(1)
      .getOne();
    return task ? this.toDetailVo(task) : null;
  }

  /**
   * 当前所有进行中任务列表(并发接单时用),按接单时间倒序.
   * 上限 20 条防恶意刷,正常骑手不应超过 5-8 单.
   */
  async myInProgress(riderId: string): Promise<RiderTaskDetailVo[]> {
    const tasks = await this.taskRepo
      .createQueryBuilder('t')
      .where('t.rider_id = :riderId', { riderId })
      .andWhere("t.status IN ('ASSIGNED','ARRIVED_PICKUP','PICKED_UP')")
      .orderBy('t.accepted_at', 'DESC')
      .limit(20)
      .getMany();
    return Promise.all(tasks.map((t) => this.toDetailVo(t)));
  }

  private async toDetailVo(task: RiderTask): Promise<RiderTaskDetailVo> {
    let errandTypeCode: 'BUY' | 'DELIVER' | 'HELP' | 'CUSTOM' | null = null;
    if (task.bizType === 'ERRAND') {
      const order = await this.errandOrderRepo.findOne({ where: { errandOrderId: task.bizOrderId } });
      errandTypeCode = order?.typeCode ?? null;
    }
    const requirePickupCode = task.bizType === 'ERRAND' && errandTypeCode === 'DELIVER';
    const requireDeliveryCode = task.bizType === 'ERRAND' && errandTypeCode !== null;
    return {
      taskId: task.riderTaskId,
      dispatchTaskId: task.dispatchTaskId,
      bizType: task.bizType,
      bizOrderId: task.bizOrderId,
      bizTaskId: task.bizTaskId,
      status: task.status,
      acceptedAt: Number(task.acceptedAt),
      arrivedPickupAt: task.arrivedPickupAt ? Number(task.arrivedPickupAt) : null,
      pickedUpAt: task.pickedUpAt ? Number(task.pickedUpAt) : null,
      deliveredAt: task.deliveredAt ? Number(task.deliveredAt) : null,
      etaAt: task.etaAt ? Number(task.etaAt) : null,
      errandTypeCode,
      requirePickupCode,
      requireDeliveryCode,
    };
  }

  /**
   * 抢单/接单:dispatchTaskId 入参,创建 rider_task 并标记 dispatch_task DISPATCHED。
   * 同步推进 food_order/errand_task 状态。
   */
  async accept(riderId: string, dispatchTaskId: string, _dto: AcceptTaskDto): Promise<AcceptTaskVo> {
    const dispatch = await this.dispatchRepo.findOne({ where: { dispatchTaskId } });
    if (!dispatch) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'dispatch task not found' });
    }
    if (dispatch.status !== 'PENDING') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `dispatch task already ${dispatch.status}`,
      });
    }
    // candidate 列表非空才校验;String() 兼容 typeorm bigint 反序列化为 string|number
    if (dispatch.candidateRiderIds && dispatch.candidateRiderIds.length > 0) {
      const ids = dispatch.candidateRiderIds.map((id) => String(id));
      if (!ids.includes(String(riderId))) {
        this.logger.warn(
          `[rider-task.accept] rider ${riderId} not in candidates [${ids.join(',')}] of dispatch ${dispatchTaskId}`,
        );
        throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'not in candidate list' });
      }
    }

    const now = Date.now();
    const inserted = await this.taskRepo.save(
      this.taskRepo.create({
        dispatchTaskId,
        riderId,
        bizType: dispatch.bizType,
        bizOrderId: dispatch.bizOrderId,
        bizTaskId: dispatch.bizTaskId,
        status: 'ASSIGNED',
        acceptedAt: String(now),
        createdAt: String(now),
        updatedAt: String(now),
      }),
    );

    await this.dispatchService.markDispatched(dispatchTaskId, riderId);

    if (dispatch.bizType === 'FOOD') {
      await this.foodOrderRepo.update(
        { foodOrderId: dispatch.bizOrderId },
        { status: 'RIDER_ASSIGNED', updatedAt: String(now) },
      );
    } else {
      if (dispatch.bizTaskId) {
        await this.errandTaskRepo.update(
          { errandTaskId: dispatch.bizTaskId },
          { status: 'ASSIGNED', riderId, updatedAt: String(now) },
        );
      }
      await this.errandOrderRepo.update(
        { errandOrderId: dispatch.bizOrderId },
        { status: 'ASSIGNED', updatedAt: String(now) },
      );
    }

    await this.eventBus.publish(
      EventName.RiderTaskAccepted,
      {
        riderTaskId: inserted.riderTaskId,
        dispatchTaskId,
        riderId,
        bizType: dispatch.bizType,
        bizOrderId: dispatch.bizOrderId,
        acceptedAt: now,
      },
      { bizType: 'rider-task', bizId: inserted.riderTaskId },
    );

    return {
      taskId: inserted.riderTaskId,
      orderId: dispatch.bizOrderId,
      bizType: dispatch.bizType,
      taskStatus: 'ASSIGNED',
    };
  }

  async arrivePickup(riderId: string, riderTaskId: string, dto: ArrivePickupDto): Promise<ArrivePickupVo> {
    const task = await this.loadTaskAndCheckStatus(riderId, riderTaskId, ['ASSIGNED']);
    const now = Date.now();
    task.status = 'ARRIVED_PICKUP';
    task.arrivedPickupAt = String(now);
    task.updatedAt = String(now);
    await this.taskRepo.save(task);

    await this.eventBus.publish(
      EventName.RiderArrivedPickup,
      {
        riderTaskId,
        riderId,
        bizType: task.bizType,
        bizOrderId: task.bizOrderId,
        lng: dto.lng,
        lat: dto.lat,
        arrivedAt: now,
      },
      { bizType: 'rider-task', bizId: riderTaskId },
    );

    return { taskId: riderTaskId, status: 'ARRIVED_PICKUP', arrivedAt: now };
  }

  async pickup(riderId: string, riderTaskId: string, dto: PickupDto): Promise<PickupVo> {
    const task = await this.loadTaskAndCheckStatus(riderId, riderTaskId, ['ARRIVED_PICKUP', 'ASSIGNED']);

    // 跑腿 + DELIVER:必须核验取件码(用户出示给骑手)
    if (task.bizType === 'ERRAND') {
      const errand = await this.errandOrderRepo.findOne({ where: { errandOrderId: task.bizOrderId } });
      if (errand?.typeCode === 'DELIVER') {
        const submitted = (dto.pickupCode ?? '').trim();
        if (!submitted) {
          throw new UnprocessableEntityException({
            code: ErrorCode.INVALID_PARAM,
            detail: 'PICKUP_CODE_REQUIRED',
            message: '请输入取件码',
          });
        }
        if (errand.pickupCode && submitted !== errand.pickupCode) {
          throw new UnprocessableEntityException({
            code: ErrorCode.STATUS_INVALID,
            detail: 'PICKUP_CODE_MISMATCH',
            message: '取件码错误,请向用户重新核对',
          });
        }
      }
    }

    const now = Date.now();
    task.status = 'PICKED_UP';
    task.pickedUpAt = String(now);
    task.updatedAt = String(now);
    await this.taskRepo.save(task);

    if (task.bizType === 'FOOD') {
      await this.foodOrderRepo.update(
        { foodOrderId: task.bizOrderId },
        { status: 'PICKED_UP', updatedAt: String(now) },
      );
    } else {
      if (task.bizTaskId) {
        await this.errandTaskRepo.update(
          { errandTaskId: task.bizTaskId },
          { status: 'PICKED_UP', updatedAt: String(now) },
        );
      }
      await this.errandOrderRepo.update(
        { errandOrderId: task.bizOrderId },
        { status: 'PICKED_UP', updatedAt: String(now) },
      );
    }

    await this.eventBus.publish(
      EventName.RiderPickedUp,
      { riderTaskId, riderId, bizType: task.bizType, bizOrderId: task.bizOrderId, pickedUpAt: now },
      { bizType: 'rider-task', bizId: riderTaskId },
    );

    return { taskId: riderTaskId, status: 'PICKED_UP', pickedUpAt: now };
  }

  async delivered(riderId: string, riderTaskId: string, dto: DeliveredDto): Promise<DeliveredVo> {
    const task = await this.loadTaskAndCheckStatus(riderId, riderTaskId, ['PICKED_UP', 'DELIVERING']);

    // 跑腿:全部类型都需要核验收货码
    if (task.bizType === 'ERRAND') {
      const errand = await this.errandOrderRepo.findOne({ where: { errandOrderId: task.bizOrderId } });
      if (errand) {
        const submitted = (dto.deliveryCode ?? '').trim();
        if (!submitted) {
          throw new UnprocessableEntityException({
            code: ErrorCode.INVALID_PARAM,
            detail: 'DELIVERY_CODE_REQUIRED',
            message: '请输入收货码',
          });
        }
        if (errand.deliveryCode && submitted !== errand.deliveryCode) {
          throw new UnprocessableEntityException({
            code: ErrorCode.STATUS_INVALID,
            detail: 'DELIVERY_CODE_MISMATCH',
            message: '收货码错误,请向用户重新核对',
          });
        }
      }
    }

    const now = Date.now();
    task.status = 'DELIVERED';
    task.deliveredAt = String(now);
    task.updatedAt = String(now);
    await this.taskRepo.save(task);

    if (task.bizType === 'FOOD') {
      await this.foodOrderRepo.update(
        { foodOrderId: task.bizOrderId },
        { status: 'DELIVERED', completedAt: String(now), updatedAt: String(now) },
      );
    } else {
      if (task.bizTaskId) {
        await this.errandTaskRepo.update(
          { errandTaskId: task.bizTaskId },
          { status: 'DELIVERED', updatedAt: String(now) },
        );
      }
      await this.errandOrderRepo.update(
        { errandOrderId: task.bizOrderId },
        { status: 'DELIVERED', completedAt: String(now), updatedAt: String(now) },
      );
    }

    await this.eventBus.publish(
      EventName.RiderDelivered,
      {
        riderTaskId,
        riderId,
        bizType: task.bizType,
        bizOrderId: task.bizOrderId,
        deliveryProof: dto.deliveryProof ?? null,
        deliveredAt: now,
      },
      { bizType: 'rider-task', bizId: riderTaskId },
    );

    return { taskId: riderTaskId, status: 'DELIVERED', deliveredAt: now };
  }

  async exception(riderId: string, riderTaskId: string, dto: ExceptionDto): Promise<ExceptionVo> {
    const task = await this.taskRepo.findOne({ where: { riderTaskId } });
    if (!task) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'task not found' });
    if (task.riderId !== riderId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'not your task' });
    }
    if (task.status === 'DELIVERED' || task.status === 'CANCELLED') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `cannot report exception at status ${task.status}`,
      });
    }

    const now = Date.now();
    const violation = await this.violationRepo.save(
      this.violationRepo.create({
        riderId,
        riderTaskId,
        type: dto.exceptionType,
        description: dto.description,
        photosJson: dto.photos ?? null,
        deductCents: null,
        status: 'PENDING_PLATFORM',
        reportedAt: String(now),
        decidedAt: null,
        decision: null,
        deductedToEarningId: null,
        createdAt: String(now),
        updatedAt: String(now),
      }),
    );

    task.status = 'EXCEPTION';
    task.exceptionAt = String(now);
    task.updatedAt = String(now);
    await this.taskRepo.save(task);

    await this.eventBus.publish(
      EventName.RiderExceptionReported,
      {
        riderViolationId: violation.riderViolationId,
        riderTaskId,
        riderId,
        exceptionType: dto.exceptionType,
        description: dto.description,
        platformHandleRequired: true,
        reportedAt: now,
      },
      { bizType: 'rider-violation', bizId: violation.riderViolationId },
    );

    return {
      exceptionId: violation.riderViolationId,
      status: 'PENDING_PLATFORM',
      platformHandleRequired: true,
    };
  }

  private async loadTaskAndCheckStatus(
    riderId: string,
    riderTaskId: string,
    expectedStatuses: string[],
  ): Promise<RiderTask> {
    const task = await this.taskRepo.findOne({ where: { riderTaskId } });
    if (!task) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'task not found' });
    if (task.riderId !== riderId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'not your task' });
    }
    if (!expectedStatuses.includes(task.status)) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `expected ${expectedStatuses.join('/')}, got ${task.status}`,
      });
    }
    return task;
  }
}
