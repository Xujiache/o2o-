import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RiderEarning, SysConfig } from '../../database/entities';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { DomainEventBus } from '../domain-event-bus';
import { EventName, type RiderDeliveredPayload } from '../events';

interface EarningFormula {
  baseFood: number;
  baseErrand: number;
  perKmCents: number;
  timelyBonus: number;
}

const DEFAULT_FORMULA: EarningFormula = { baseFood: 500, baseErrand: 300, perKmCents: 50, timelyBonus: 200 };

@Injectable()
export class RiderDeliveredSubscriber {
  private readonly logger = new Logger(RiderDeliveredSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
    @InjectRepository(RiderEarning) private readonly earningRepo: Repository<RiderEarning>,
    @InjectRepository(SysConfig) private readonly sysConfigRepo: Repository<SysConfig>,
    private readonly eventBus: DomainEventBus,
  ) {}

  @OnEvent(EventName.RiderDelivered)
  async handle(payload: RiderDeliveredPayload): Promise<void> {
    this.logger.log(`[rider-task.delivered] taskId=${payload.riderTaskId}`);

    // 1. 实时累加骑手收益(按日聚合,跨日新建,与 daily-settle job 公式一致)
    await this.accrueEarning(payload).catch((err: unknown) =>
      this.logger.error({ err }, '[rider-task.delivered] accrue earning failed (non-blocking)'),
    );

    // 2. 通知客户(短信)
    await this.gateway.sms
      .send(payload.bizOrderId, 'ORDER_DELIVERED', payload.riderId)
      .catch((err: unknown) => this.logger.warn({ err }, '[rider-task.delivered] sms failed (non-blocking)'));

    // 3. audit log
    await this.auditLog.writeAudit({
      traceId: `rider-delivered-${payload.riderTaskId}`,
      operatorType: 'rider',
      operatorId: payload.riderId,
      targetType: 'rider-task',
      targetId: payload.riderTaskId,
      afterStatus: 'DELIVERED',
      summary: `骑手已送达 ${payload.bizType} ${payload.bizOrderId}`,
    });
  }

  private async accrueEarning(payload: RiderDeliveredPayload): Promise<void> {
    const formula = await this.getFormula();
    const settleDate = this.toSettleDate(new Date());
    const base = payload.bizType === 'FOOD' ? formula.baseFood : formula.baseErrand;
    const timely = formula.timelyBonus; // 简化:无 LATE 即给

    const existing = await this.earningRepo.findOne({ where: { riderId: payload.riderId, settleDate } });
    const now = Date.now();
    if (existing) {
      const newBase = String(BigInt(existing.baseAmount) + BigInt(base));
      const newTimely = String(BigInt(existing.timelyBonus) + BigInt(timely));
      const newTotal = String(BigInt(existing.totalAmount) + BigInt(base) + BigInt(timely));
      await this.earningRepo.update(
        { riderEarningId: existing.riderEarningId },
        {
          orderCount: existing.orderCount + 1,
          baseAmount: newBase,
          timelyBonus: newTimely,
          totalAmount: newTotal,
          updatedAt: String(now),
        },
      );
      this.logger.log(
        `[rider-earning] accrued rider=${payload.riderId} +${base + timely} (orderCount=${existing.orderCount + 1})`,
      );
      return;
    }

    const totalAmount = String(BigInt(base) + BigInt(timely));
    const inserted = await this.earningRepo.save(
      this.earningRepo.create({
        riderId: payload.riderId,
        settleDate,
        orderCount: 1,
        baseAmount: String(base),
        distanceAmount: '0',
        timelyBonus: String(timely),
        rewardAmount: '0',
        deductAmount: '0',
        totalAmount,
        status: 'PENDING',
        settledAt: String(now),
        createdAt: String(now),
        updatedAt: String(now),
      }),
    );
    this.logger.log(`[rider-earning] created rider=${payload.riderId} settleDate=${settleDate} total=${totalAmount}`);

    await this.eventBus.publish(
      EventName.RiderEarningGenerated,
      {
        riderEarningId: inserted.riderEarningId,
        riderId: payload.riderId,
        settleDate,
        totalAmount,
        generatedAt: now,
      },
      { bizType: 'rider-earning', bizId: inserted.riderEarningId },
    );
  }

  private toSettleDate(d: Date): number {
    return Number(
      `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`,
    );
  }

  private async getFormula(): Promise<EarningFormula> {
    const cfg = await this.sysConfigRepo.findOne({ where: { configKey: 'rider.earning.formula' } });
    if (!cfg) return DEFAULT_FORMULA;
    try {
      const parsed = JSON.parse(cfg.configValue) as Partial<EarningFormula>;
      return {
        baseFood: Number(parsed.baseFood ?? DEFAULT_FORMULA.baseFood),
        baseErrand: Number(parsed.baseErrand ?? DEFAULT_FORMULA.baseErrand),
        perKmCents: Number(parsed.perKmCents ?? DEFAULT_FORMULA.perKmCents),
        timelyBonus: Number(parsed.timelyBonus ?? DEFAULT_FORMULA.timelyBonus),
      };
    } catch {
      return DEFAULT_FORMULA;
    }
  }
}
