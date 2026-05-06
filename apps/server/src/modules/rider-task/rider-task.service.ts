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

import { DispatchTask, ErrandOrder, ErrandTask, FoodOrder, RiderTask, RiderViolation } from '../../database/entities';
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
} from './rider-task.dto';

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
    private readonly dispatchService: DispatchService,
    private readonly eventBus: DomainEventBus,
  ) {}

  async detail(riderId: string, riderTaskId: string): Promise<RiderTaskDetailVo> {
    const task = await this.taskRepo.findOne({ where: { riderTaskId } });
    if (!task) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'task not found' });
    if (task.riderId !== riderId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'not your task' });
    }
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
    if (dispatch.candidateRiderIds && !dispatch.candidateRiderIds.includes(riderId)) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'not in candidate list' });
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

  async pickup(riderId: string, riderTaskId: string, _dto: PickupDto): Promise<PickupVo> {
    const task = await this.loadTaskAndCheckStatus(riderId, riderTaskId, ['ARRIVED_PICKUP', 'ASSIGNED']);
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
