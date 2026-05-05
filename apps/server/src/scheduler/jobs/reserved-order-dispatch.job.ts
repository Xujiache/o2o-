import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FoodOrder } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const SOON_WINDOW_MS = 30 * 60 * 1000; // 30 min 内将到的预约单
const SCAN_LIMIT = 100;

/**
 * 预约订单到点调度:扫 30 min 内将到点的 reserved 订单,触发提醒(stage 7 商家流程接 mock log)。
 */
@Injectable()
export class ReservedOrderDispatchJob extends BaseJob {
  readonly name = 'reserved-order-dispatch';
  protected override lockTtlMs = 60_000;

  constructor(
    @InjectRepository(FoodOrder) private readonly orderRepo: Repository<FoodOrder>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 */1 * * * *', { name: 'reserved-order-dispatch' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = Date.now();
    const soon = now + SOON_WINDOW_MS;
    const orders = await this.orderRepo
      .createQueryBuilder('o')
      .where("o.delivery_type = 'reserved' AND o.status = 'PAID_WAIT_MERCHANT'")
      .andWhere('o.reserved_time IS NOT NULL AND o.reserved_time BETWEEN :now AND :soon', { now, soon })
      .limit(SCAN_LIMIT)
      .getMany();
    if (!orders.length) {
      this.logger.debug('[reserved-order-dispatch] no upcoming reserved orders');
      return;
    }
    this.logger.log(`[reserved-order-dispatch] reminding ${orders.length} reserved orders`);
    for (const o of orders) {
      // stage 7 真接:发送商家二次提醒推送
      this.logger.log(
        `[reserved-order-dispatch] orderId=${o.foodOrderId} reservedTime=${o.reservedTime} (stage 7 实接商家提醒)`,
      );
    }
  }
}
