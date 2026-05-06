import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AfterSale, AfterSaleArbitration } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { AdminRefundService } from '../admin-refund/admin-refund.service';

import type { ArbitrateDto, ArbitrateVo } from './arbitrate.dto';

@Injectable()
export class ArbitrateService {
  constructor(
    @InjectRepository(AfterSale) private readonly afterSaleRepo: Repository<AfterSale>,
    @InjectRepository(AfterSaleArbitration)
    private readonly arbitrationRepo: Repository<AfterSaleArbitration>,
    private readonly refundService: AdminRefundService,
    private readonly eventBus: DomainEventBus,
  ) {}

  async arbitrate(afterSaleId: string, dto: ArbitrateDto, operatorAdminId: string): Promise<ArbitrateVo> {
    const afterSale = await this.afterSaleRepo.findOne({ where: { afterSaleId } });
    if (!afterSale) throw new NotFoundException('after-sale not found');
    if (afterSale.status !== 'PENDING_PLATFORM') {
      throw new BadRequestException(`after-sale status ${afterSale.status} not allowed for arbitrate`);
    }

    const now = Date.now();
    let refundOrderId: string | null = null;

    // decision=APPROVE/PARTIAL → 创建退款
    if (dto.decision === 'APPROVE' || dto.decision === 'PARTIAL') {
      const refund = await this.refundService.createFromArbitration({
        bizType: 'FOOD', // after_sale 仅外卖触发(stage 7 既有边界)
        bizOrderId: afterSale.orderId,
        paymentOrderId: null,
        amount: dto.refundAmount,
      });
      refundOrderId = refund.refundOrderId;
    }

    // 写仲裁记录
    const arb = this.arbitrationRepo.create({
      afterSaleId,
      responsibleParty: dto.responsibleParty,
      decision: dto.decision,
      refundAmount: dto.refundAmount,
      penalty: dto.penalty,
      remark: dto.remark ?? null,
      operatorAdminId,
      refundOrderId,
      createdAt: String(now),
    });
    const savedArb = await this.arbitrationRepo.save(arb);

    // 更新 after_sale 状态
    afterSale.status = dto.decision === 'REJECT' ? 'COMPLETED' : 'REFUNDED';
    await this.afterSaleRepo.save(afterSale);

    await this.eventBus.publish(
      EventName.ArbitrationCompleted,
      {
        arbitrationId: savedArb.arbitrationId,
        afterSaleId,
        responsibleParty: dto.responsibleParty,
        decision: dto.decision,
        refundAmount: dto.refundAmount,
        penalty: dto.penalty,
        refundOrderId,
        operatorAdminId,
        completedAt: now,
      },
      { bizType: 'after-sale', bizId: afterSaleId },
    );

    return { afterSaleId, status: afterSale.status, refundOrderId };
  }
}
