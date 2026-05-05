import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { In, Repository } from 'typeorm';

import { MerchantPromotion, type PromoStatus, Store } from '../../database/entities';

import {
  CreatePromotionDto,
  CreatePromotionVo,
  ListPromotionsQueryDto,
  PromotionItemVo,
  SetPromoStatusDto,
} from './merchant-promotion.dto';

const ALLOWED_TRANSITIONS: Record<PromoStatus, PromoStatus[]> = {
  draft: ['scheduled', 'ended'],
  scheduled: ['active', 'paused', 'ended'],
  active: ['paused', 'ended'],
  paused: ['active', 'ended'],
  ended: [],
};

@Injectable()
export class MerchantPromotionService {
  constructor(
    @InjectRepository(MerchantPromotion) private readonly promoRepo: Repository<MerchantPromotion>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
  ) {}

  async create(merchantId: string, dto: CreatePromotionDto): Promise<CreatePromotionVo> {
    const store = await this.requireOwnStore(merchantId);

    if (dto.startTime >= dto.endTime) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        message: 'startTime 必须早于 endTime',
      });
    }

    // 校验 productIds 与现有 active/scheduled promo 是否有重叠
    const conflicts = await this.promoRepo.find({
      where: { storeId: store.storeId, status: In(['active', 'scheduled']) },
    });
    for (const c of conflicts) {
      const overlap = c.productIds.filter((id) => dto.productIds.includes(id));
      if (overlap.length > 0) {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          message: `商品已加入活动 ${c.promoId},不可重叠`,
        });
      }
    }

    const now = String(Date.now());
    const initialStatus: PromoStatus = dto.startTime <= Date.now() ? 'scheduled' : 'draft';
    const saved = await this.promoRepo.save(
      this.promoRepo.create({
        storeId: store.storeId,
        promoType: dto.promoType,
        name: dto.name,
        productIds: dto.productIds,
        rules: dto.rules as MerchantPromotion['rules'],
        startTime: String(dto.startTime),
        endTime: String(dto.endTime),
        status: initialStatus,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return { promoId: saved.promoId, status: saved.status };
  }

  async list(merchantId: string, query: ListPromotionsQueryDto): Promise<PromotionItemVo[]> {
    const store = await this.requireOwnStore(merchantId);
    const rows = await this.promoRepo.find({
      where: query.status ? { storeId: store.storeId, status: query.status } : { storeId: store.storeId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((p) => ({
      promoId: p.promoId,
      storeId: p.storeId,
      promoType: p.promoType,
      name: p.name,
      productIds: p.productIds,
      status: p.status,
      startTime: p.startTime,
      endTime: p.endTime,
    }));
  }

  async setStatus(
    merchantId: string,
    promoId: string,
    dto: SetPromoStatusDto,
  ): Promise<{ promoId: string; status: string }> {
    const promo = await this.promoRepo.findOne({ where: { promoId } });
    if (!promo) throw new NotFoundException('promotion not found');
    const store = await this.storeRepo.findOne({ where: { storeId: promo.storeId } });
    if (!store || store.merchantId !== merchantId) {
      throw new ForbiddenException('cannot access another store promotion');
    }

    const allowed = ALLOWED_TRANSITIONS[promo.status];
    if (!allowed.includes(dto.status as PromoStatus)) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `status ${promo.status} 不可转 ${dto.status}`,
      });
    }
    await this.promoRepo.update({ promoId }, { status: dto.status as PromoStatus, updatedAt: String(Date.now()) });
    return { promoId, status: dto.status };
  }

  private async requireOwnStore(merchantId: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { merchantId } });
    if (!store) throw new ForbiddenException('店铺不存在');
    return store;
  }
}
