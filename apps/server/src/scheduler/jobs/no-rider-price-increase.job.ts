import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { ErrandOrder, ErrandTask, ErrandTimeline } from '../../database/entities';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const NO_RIDER_THRESHOLD_MS = 3 * 60 * 1000;
const PRICE_INC_FEE = 200; // 2 元加价提示(不实际扣费)
const SCAN_LIMIT = 50;

/**
 * Stage 6 — 跑腿订单 3 min 无骑手接单 → 加价提示(推送骑手,不自动扣款)。
 * 每 1 分钟扫一次。
 */
@Injectable()
export class NoRiderPriceIncreaseJob extends BaseJob {
  readonly name = 'no-rider-price-increase';
  protected override lockTtlMs = 60_000;

  constructor(
    @InjectRepository(ErrandOrder) private readonly orderRepo: Repository<ErrandOrder>,
    @InjectRepository(ErrandTask) private readonly taskRepo: Repository<ErrandTask>,
    private readonly dataSource: DataSource,
    private readonly gateway: IntegrationGatewayService,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 */1 * * * *', { name: 'no-rider-price-increase' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = Date.now();
    const tasks = await this.taskRepo
      .createQueryBuilder('t')
      .where("t.status = 'READY_FOR_DISPATCH'")
      .andWhere('t.created_at < :threshold', { threshold: String(now - NO_RIDER_THRESHOLD_MS) })
      .andWhere('t.dispatch_count = 0')
      .limit(SCAN_LIMIT)
      .getMany();
    if (!tasks.length) return;
    this.logger.log(`[no-rider-price-increase] processing ${tasks.length} stale tasks`);

    for (const task of tasks) {
      const order = await this.orderRepo.findOne({ where: { errandOrderId: task.errandOrderId } });
      if (!order) continue;

      const newIncr = String(Number(task.priceIncrease) + PRICE_INC_FEE);
      try {
        await this.dataSource.transaction(async (em: EntityManager) => {
          await em.getRepository(ErrandTask).update(
            { errandTaskId: task.errandTaskId },
            {
              dispatchCount: 1,
              priceIncrease: newIncr,
              lastDispatchedAt: String(now),
              updatedAt: String(now),
            },
          );
          await em.getRepository(ErrandTimeline).insert({
            errandOrderId: task.errandOrderId,
            eventType: 'PRICE_INCREASED',
            payload: { source: 'system', priceIncrease: newIncr },
            operator: 'system',
            createdAt: String(now),
          });
        });

        await this.gateway.getui
          .pushOne({
            cid: 'rider:nearby',
            title: '订单加价提示',
            body: `订单 ${task.errandOrderId} 已加价 ${PRICE_INC_FEE} 分,请尽快接单`,
            payload: { orderId: task.errandOrderId, increase: newIncr },
          })
          .catch((err: unknown) => this.logger.warn({ err }, '[no-rider-price-increase] push failed'));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[no-rider-price-increase] failed taskId=${task.errandTaskId}: ${msg}`);
      }
    }
  }
}
