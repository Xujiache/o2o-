import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import {
  ErrandTask,
  FoodOrder,
  RiderAccount,
  RiderApplication,
  RiderServiceArea,
  RiderStatus,
  Store,
} from '../../database/entities';

import { TaskPoolQueryDto, TaskPoolVo } from './rider-task-pool.dto';

const PICKUP_DEADLINE_MS = 30 * 60 * 1000; // stage 5 简化:READY_FOR_PICKUP 后 30 min 截止
const REWARD_BASE_CENTS = 500; // 5 元基础酬劳(stage 8 真计算)

/**
 * 接单大厅服务(stage 3 骨架 + stage 5+6 扩展)。
 *
 * 校验 rider 必须 approved + online + 有 service_area。
 * Stage 5:扫 food_order WHERE status='READY_FOR_PICKUP' 返简化任务卡(只读)。
 * Stage 6:扫 errand_task WHERE status='READY_FOR_DISPATCH' 返跑腿任务卡(只读)。
 * 接单 / 取餐 / 送达 → stage 8 实现。
 */
@Injectable()
export class RiderTaskPoolService {
  private readonly logger = new Logger(RiderTaskPoolService.name);

  constructor(
    @InjectRepository(RiderAccount) private readonly riderRepo: Repository<RiderAccount>,
    @InjectRepository(RiderApplication) private readonly appRepo: Repository<RiderApplication>,
    @InjectRepository(RiderStatus) private readonly statusRepo: Repository<RiderStatus>,
    @InjectRepository(RiderServiceArea) private readonly areaRepo: Repository<RiderServiceArea>,
    @InjectRepository(FoodOrder) private readonly foodOrderRepo: Repository<FoodOrder>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(ErrandTask) private readonly errandTaskRepo: Repository<ErrandTask>,
  ) {}

  async listAvailable(riderId: string, query: TaskPoolQueryDto): Promise<TaskPoolVo> {
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
      return { items: [], total: 0 };
    }
    const area = await this.areaRepo.findOne({ where: { riderId } });
    if (!area) {
      this.logger.debug(`[task-pool] rider ${riderId} has no service-area; returning empty`);
      return { items: [], total: 0 };
    }

    const wantTakeaway = !query.bizType || query.bizType === 'takeaway';
    const wantErrand = !query.bizType || query.bizType === 'errand';

    const items: Array<{
      taskId: string;
      bizType: 'takeaway' | 'errand';
      distance: number;
      reward: number;
      deadline: number;
      pickupAddress: { lng: number; lat: number; text: string };
      deliveryAddress: { lng: number; lat: number; text: string };
    }> = [];

    // stage 5:扫 READY_FOR_PICKUP 外卖订单(只读骨架)
    if (wantTakeaway) {
      const orders = await this.foodOrderRepo
        .createQueryBuilder('o')
        .where("o.status = 'READY_FOR_PICKUP'")
        .orderBy('o.created_at', 'ASC')
        .limit(20)
        .getMany();
      if (orders.length) {
        const storeIds = Array.from(new Set(orders.map((o) => o.storeId)));
        const storeRows = storeIds.length
          ? await this.storeRepo.createQueryBuilder('s').where('s.store_id IN (:...ids)', { ids: storeIds }).getMany()
          : [];
        const storeMap = new Map(storeRows.map((s) => [s.storeId, s]));
        for (const o of orders) {
          const store = storeMap.get(o.storeId);
          const addressSnapshot = (o.addressSnapshot ?? {}) as {
            lng?: number;
            lat?: number;
            detail?: string;
          };
          items.push({
            taskId: o.foodOrderId,
            bizType: 'takeaway',
            distance: 1500,
            reward: REWARD_BASE_CENTS,
            deadline: Number(o.paidAt ?? o.createdAt) + PICKUP_DEADLINE_MS,
            pickupAddress: { lng: 116.4, lat: 39.9, text: store?.name ?? '门店地址' },
            deliveryAddress: {
              lng: addressSnapshot.lng ?? 116.4,
              lat: addressSnapshot.lat ?? 39.9,
              text: addressSnapshot.detail ?? '收货地址',
            },
          });
        }
      }
    }

    // stage 6:扫 errand_task READY_FOR_DISPATCH(只读骨架)
    if (wantErrand) {
      const tasks = await this.errandTaskRepo
        .createQueryBuilder('t')
        .where("t.status = 'READY_FOR_DISPATCH'")
        .orderBy('t.created_at', 'ASC')
        .limit(20)
        .getMany();
      for (const t of tasks) {
        const pickup = t.pickupAddress;
        const delivery = t.deliveryAddress;
        items.push({
          taskId: t.errandTaskId,
          bizType: 'errand',
          distance: t.distanceMeters,
          reward: REWARD_BASE_CENTS + Number(t.priceIncrease ?? 0),
          deadline: Number(t.createdAt) + PICKUP_DEADLINE_MS,
          pickupAddress: {
            lng: pickup?.lng ?? 116.4,
            lat: pickup?.lat ?? 39.9,
            text: pickup?.address ?? '取货地址',
          },
          deliveryAddress: {
            lng: delivery?.lng ?? 116.4,
            lat: delivery?.lat ?? 39.9,
            text: delivery?.address ?? '收货地址',
          },
        });
      }
    }

    return { items, total: items.length };
  }
}
