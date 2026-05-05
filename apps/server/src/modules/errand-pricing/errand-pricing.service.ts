import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { ErrandPricing } from '../../database/entities';
import type { ErrandOrderUrgentLevel } from '../../database/entities';

export interface PricingInput {
  cityCode?: string | null;
  /** 距离 米 */
  distanceMeters: number;
  urgentLevel: ErrandOrderUrgentLevel;
  /** kg;可空 */
  weightKg?: number | null;
}

export interface PricingResult {
  /** 单位:分 */
  baseFee: string;
  /** 单位:分 */
  distanceFee: string;
  /** 单位:分(加急 + 重量加价) */
  urgentFee: string;
  payableAmount: string;
}

@Injectable()
export class ErrandPricingService {
  constructor(@InjectRepository(ErrandPricing) private readonly repo: Repository<ErrandPricing>) {}

  /** 取计价规则。优先匹配 cityCode,无则回落 GLOBAL。 */
  async findRule(cityCode?: string | null): Promise<ErrandPricing> {
    let rule: ErrandPricing | null = null;
    if (cityCode && cityCode !== 'GLOBAL') {
      rule = await this.repo.findOne({ where: { cityCode, enabled: 1 } });
    }
    if (!rule) {
      rule = await this.repo.findOne({ where: { cityCode: 'GLOBAL', enabled: 1 } });
    }
    if (!rule) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'ERRAND_PRICING_NOT_FOUND',
        message: '跑腿计价规则未配置',
      });
    }
    return rule;
  }

  /** 计算应付金额(全部以"分"为单位返回 string) */
  async calc(input: PricingInput): Promise<PricingResult> {
    const rule = await this.findRule(input.cityCode);

    const baseFee = BigInt(rule.baseFee);

    const effectiveDistance = Math.max(0, input.distanceMeters - rule.minDistanceMeters);
    // 距离费按"满 1 km 起步"向上取整 km,与 base 之外按 km 计
    const km = Math.ceil(effectiveDistance / 1000);
    const distanceFee = BigInt(rule.distanceFeePerKm) * BigInt(km);

    const urgentFee = this.urgentFee(rule, input.urgentLevel);
    const weightFee = this.weightFee(rule, input.weightKg);
    const totalUrgent = urgentFee + weightFee;

    const payable = baseFee + distanceFee + totalUrgent;

    return {
      baseFee: baseFee.toString(),
      distanceFee: distanceFee.toString(),
      urgentFee: totalUrgent.toString(),
      payableAmount: payable.toString(),
    };
  }

  private urgentFee(rule: ErrandPricing, level: ErrandOrderUrgentLevel): bigint {
    switch (level) {
      case 'fast':
        return BigInt(rule.urgentFastFee);
      case 'express':
        return BigInt(rule.urgentExpressFee);
      case 'standard':
      default:
        return BigInt(rule.urgentStandardFee);
    }
  }

  private weightFee(rule: ErrandPricing, weightKg: number | null | undefined): bigint {
    if (weightKg == null || weightKg <= 0) return 0n;
    // 满 1 kg 起步,向上取整
    const kg = Math.ceil(weightKg);
    return BigInt(rule.weightExtraPerKg) * BigInt(kg);
  }
}
