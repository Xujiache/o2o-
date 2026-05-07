import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import {
  DispatchTask,
  ErrandTask,
  FoodOrder,
  RiderAccount,
  RiderApplication,
  RiderServiceArea,
  RiderStatus,
  Store,
  SysConfig,
} from '../../database/entities';

import { TaskPoolQueryDto, TaskPoolVo } from './rider-task-pool.dto';

const REWARD_BASE_CENTS = 500; // 5 元基础酬劳(stage 11 接智能定价)

/**
 * 接单大厅服务。
 *
 * Stage 8 完整链路:
 *  - 商家"出餐"-> FoodReadyForPickup 事件 -> DispatchService 建 dispatch_task PENDING
 *  - 本接口扫 dispatch_task PENDING + 候选含本骑手 -> 拼装 store / address 显示
 *  - accept(dispatchTaskId) -> rider_task ASSIGNED
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
    @InjectRepository(DispatchTask) private readonly dispatchRepo: Repository<DispatchTask>,
    @InjectRepository(SysConfig) private readonly sysConfigRepo: Repository<SysConfig>,
  ) {}

  /** 读后台配置:加急规则多档(分钟数 + 补贴金额) */
  private async getPromoteTiers(): Promise<Array<{ minutes: number; subsidyCents: number }>> {
    const cfg = await this.sysConfigRepo.findOne({ where: { configKey: 'dispatch.no-rider.promote.tiers' } });
    if (!cfg) return [];
    try {
      const parsed = JSON.parse(cfg.configValue) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((t: unknown): t is { minutes: number; subsidyCents: number } => {
          const o = t as { minutes?: unknown; subsidyCents?: unknown };
          return typeof o.minutes === 'number' && typeof o.subsidyCents === 'number';
        })
        .sort((a, b) => a.minutes - b.minutes);
    } catch {
      return [];
    }
  }

  /** 根据已等待时长 + 配置档位算补贴(取最高满足档) */
  private calcSubsidy(
    waitedMs: number,
    tiers: Array<{ minutes: number; subsidyCents: number }>,
  ): { subsidyCents: number; waitedMinutes: number } {
    const waitedMinutes = Math.max(0, Math.floor(waitedMs / 60000));
    let subsidyCents = 0;
    for (const t of tiers) {
      if (waitedMinutes >= t.minutes) subsidyCents = t.subsidyCents;
    }
    return { subsidyCents, waitedMinutes };
  }

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

    // 扫 dispatch_task PENDING + 候选含本骑手(stage 8 真接单链路)
    const now = Date.now();
    const dispatchRows = await this.dispatchRepo
      .createQueryBuilder('d')
      .where("d.status = 'PENDING'")
      .andWhere('d.timeout_at > :now', { now: String(now) })
      .orderBy('d.created_at', 'ASC')
      .limit(50)
      .getMany();

    const eligible = dispatchRows.filter((d) => {
      // candidate 列表非空时必须包含本骑手;为空时所有骑手都可见(兼容历史数据)
      if (d.candidateRiderIds && d.candidateRiderIds.length > 0 && !d.candidateRiderIds.includes(riderId)) return false;
      if (d.bizType === 'FOOD' && !wantTakeaway) return false;
      if (d.bizType === 'ERRAND' && !wantErrand) return false;
      return true;
    });

    // 读后台加急规则
    const promoteTiers = await this.getPromoteTiers();

    const items: Array<{
      taskId: string;
      bizType: 'takeaway' | 'errand';
      distance: number;
      reward: number;
      priceIncreaseCents: number;
      urgent: boolean;
      waitedMinutes: number;
      deadline: number;
      pickupAddress: { lng: number; lat: number; text: string };
      deliveryAddress: { lng: number; lat: number; text: string };
      _createdAt: number; // 仅用于排序,不返客户端
    }> = [];

    // 批量查 food_order + store
    const foodOrderIds = eligible.filter((d) => d.bizType === 'FOOD').map((d) => d.bizOrderId);
    const foodOrders = foodOrderIds.length
      ? await this.foodOrderRepo
          .createQueryBuilder('o')
          .where('o.food_order_id IN (:...ids)', { ids: foodOrderIds })
          .getMany()
      : [];
    const foodOrderMap = new Map(foodOrders.map((o) => [o.foodOrderId, o]));
    const storeIds = Array.from(new Set(foodOrders.map((o) => o.storeId)));
    const stores = storeIds.length
      ? await this.storeRepo.createQueryBuilder('s').where('s.store_id IN (:...ids)', { ids: storeIds }).getMany()
      : [];
    const storeMap = new Map(stores.map((s) => [s.storeId, s]));

    // 批量查 errand_task
    const errandTaskIds = eligible.filter((d) => d.bizType === 'ERRAND' && d.bizTaskId).map((d) => d.bizTaskId!);
    const errandTasks = errandTaskIds.length
      ? await this.errandTaskRepo
          .createQueryBuilder('t')
          .where('t.errand_task_id IN (:...ids)', { ids: errandTaskIds })
          .getMany()
      : [];
    const errandTaskMap = new Map(errandTasks.map((t) => [t.errandTaskId, t]));

    for (const d of eligible) {
      const createdAt = Number(d.createdAt);
      const { subsidyCents, waitedMinutes } = this.calcSubsidy(now - createdAt, promoteTiers);

      if (d.bizType === 'FOOD') {
        const o = foodOrderMap.get(d.bizOrderId);
        if (!o) continue;
        const store = storeMap.get(o.storeId);
        const addressSnapshot = (o.addressSnapshot ?? {}) as { lng?: number; lat?: number; detail?: string };
        items.push({
          taskId: d.dispatchTaskId,
          bizType: 'takeaway',
          distance: 1500,
          reward: REWARD_BASE_CENTS + subsidyCents,
          priceIncreaseCents: subsidyCents,
          urgent: subsidyCents > 0,
          waitedMinutes,
          deadline: Number(d.timeoutAt),
          pickupAddress: { lng: 116.4, lat: 39.9, text: store?.name ?? '门店地址' },
          deliveryAddress: {
            lng: addressSnapshot.lng ?? 116.4,
            lat: addressSnapshot.lat ?? 39.9,
            text: addressSnapshot.detail ?? '收货地址',
          },
          _createdAt: createdAt,
        });
      } else if (d.bizType === 'ERRAND' && d.bizTaskId) {
        const t = errandTaskMap.get(d.bizTaskId);
        if (!t) continue;
        // 跑腿:既算 dispatch 等待补贴,也算原 errand_task.priceIncrease(stage 6 已有,叠加)
        const errandIncrease = Number(t.priceIncrease ?? 0);
        const totalSubsidy = subsidyCents + errandIncrease;
        const pickup = t.pickupAddress;
        const delivery = t.deliveryAddress;
        items.push({
          taskId: d.dispatchTaskId,
          bizType: 'errand',
          distance: t.distanceMeters,
          reward: REWARD_BASE_CENTS + totalSubsidy,
          priceIncreaseCents: totalSubsidy,
          urgent: totalSubsidy > 0,
          waitedMinutes,
          deadline: Number(d.timeoutAt),
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
          _createdAt: createdAt,
        });
      }
    }

    // 排序:加急(补贴金额大)优先,然后按等待时长 DESC(久的优先)
    items.sort((a, b) => {
      if (a.priceIncreaseCents !== b.priceIncreaseCents) return b.priceIncreaseCents - a.priceIncreaseCents;
      return a._createdAt - b._createdAt; // 早派的先
    });

    // 剥掉内部排序字段
    const finalItems = items.map(({ _createdAt: _, ...rest }) => rest);
    return { items: finalItems, total: finalItems.length };
  }
}
