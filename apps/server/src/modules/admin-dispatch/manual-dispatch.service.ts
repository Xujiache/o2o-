import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DispatchTask, ManualDispatchLog } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import type { ManualAssignDto, ManualAssignVo } from './manual-dispatch.dto';

@Injectable()
export class ManualDispatchService {
  constructor(
    @InjectRepository(DispatchTask) private readonly dispatchRepo: Repository<DispatchTask>,
    @InjectRepository(ManualDispatchLog) private readonly logRepo: Repository<ManualDispatchLog>,
    private readonly eventBus: DomainEventBus,
  ) {}

  /** 人工指派骑手:校验状态 PENDING/TIMEOUT → 写 log + 更新 dispatch_task → emit 2 events */
  async manualAssign(taskId: string, dto: ManualAssignDto, operatorAdminId: string): Promise<ManualAssignVo> {
    const task = await this.dispatchRepo.findOne({ where: { dispatchTaskId: taskId } });
    if (!task) throw new NotFoundException('dispatch task not found');
    if (task.status !== 'PENDING' && task.status !== 'TIMEOUT') {
      throw new BadRequestException(`task status ${task.status} not allowed for manual assign`);
    }
    const beforeStatus = task.status;
    const oldRiderId = task.acceptedRiderId;
    const now = Date.now();

    task.acceptedRiderId = dto.riderId;
    task.status = 'DISPATCHED';
    task.dispatchedAt = String(now);
    task.updatedAt = String(now);
    await this.dispatchRepo.save(task);

    const log = this.logRepo.create({
      dispatchTaskId: taskId,
      riderId: dto.riderId,
      operatorAdminId,
      reason: dto.reason ?? null,
      beforeStatus,
      afterStatus: 'DISPATCHED',
      createdAt: String(now),
    });
    await this.logRepo.save(log);

    await this.eventBus.publish(
      EventName.ManualDispatchCreated,
      {
        dispatchTaskId: taskId,
        riderId: dto.riderId,
        operatorAdminId,
        reason: dto.reason ?? null,
        createdAt: now,
      },
      { bizType: 'dispatch', bizId: taskId },
    );
    await this.eventBus.publish(
      EventName.OrderReassigned,
      {
        dispatchTaskId: taskId,
        oldRiderId,
        newRiderId: dto.riderId,
        operatorAdminId,
        reassignedAt: now,
      },
      { bizType: 'dispatch', bizId: taskId },
    );
    return { taskId, dispatchStatus: 'DISPATCHED', assignedAt: now };
  }
}
