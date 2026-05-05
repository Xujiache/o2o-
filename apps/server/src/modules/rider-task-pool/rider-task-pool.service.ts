import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { RiderAccount, RiderApplication, RiderServiceArea, RiderStatus } from '../../database/entities';

import { TaskPoolQueryDto, TaskPoolVo } from './rider-task-pool.dto';

/**
 * 接单大厅服务(stage 3 骨架,per ALIGNMENT D-4)。
 *
 * 本阶段:校验 rider 必须 approved + online + 有 service_area,然后返回空数组。
 * Stage 5/6 真订单出来后,在此处:
 *  1. 按 bizType 过滤外卖/跑腿订单
 *  2. 计算 rider 当前位置到 pickup 点距离 ≤ radius
 *  3. 校验 pickup 点在 rider 服务区内
 *  4. 排序按 distance ASC + deadline ASC
 */
@Injectable()
export class RiderTaskPoolService {
  private readonly logger = new Logger(RiderTaskPoolService.name);

  constructor(
    @InjectRepository(RiderAccount) private readonly riderRepo: Repository<RiderAccount>,
    @InjectRepository(RiderApplication) private readonly appRepo: Repository<RiderApplication>,
    @InjectRepository(RiderStatus) private readonly statusRepo: Repository<RiderStatus>,
    @InjectRepository(RiderServiceArea) private readonly areaRepo: Repository<RiderServiceArea>,
  ) {}

  async listAvailable(riderId: string, query: TaskPoolQueryDto): Promise<TaskPoolVo> {
    void query;
    const rider = await this.riderRepo.findOne({ where: { riderId } });
    if (!rider) throw new NotFoundException('rider not found');
    if (rider.accountStatus !== 'active') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '账号已被禁用',
      });
    }
    const latestApp = await this.appRepo.findOne({
      where: { mobile: rider.mobile },
      order: { submittedAt: 'DESC' },
    });
    if (!latestApp || latestApp.auditStatus !== 'approved') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '入驻审核未通过',
      });
    }
    const status = await this.statusRepo.findOne({ where: { riderId } });
    if (!status || status.onlineStatus !== 'online') {
      // 未上线时返空数组,不抛错(前端可正常 loading 后展示空状态)
      return { items: [], total: 0 };
    }
    const area = await this.areaRepo.findOne({ where: { riderId } });
    if (!area) {
      this.logger.debug(`[task-pool] rider ${riderId} has no service-area; returning empty`);
      return { items: [], total: 0 };
    }
    // 真订单查询留 stage 5/6
    return { items: [], total: 0 };
  }
}
