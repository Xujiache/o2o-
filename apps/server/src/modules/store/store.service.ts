import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { DataSource, Repository } from 'typeorm';

import {
  MerchantAccount,
  Store,
  StoreBusinessHour,
  type StoreBusinessStatus,
  StoreDeliveryArea,
} from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { FileService } from '../file/file.service';

import {
  SetBusinessStatusDto,
  SetBusinessStatusVo,
  StoreVo,
  UpdateStoreSettingsDto,
  UpdateStoreSettingsVo,
} from './store.dto';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(StoreBusinessHour) private readonly hourRepo: Repository<StoreBusinessHour>,
    @InjectRepository(StoreDeliveryArea) private readonly areaRepo: Repository<StoreDeliveryArea>,
    @InjectRepository(MerchantAccount) private readonly merchantRepo: Repository<MerchantAccount>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventBus: DomainEventBus,
    private readonly fileService: FileService,
  ) {}

  async getOwnStore(merchantId: string): Promise<StoreVo> {
    const store = await this.storeRepo.findOne({ where: { merchantId } });
    if (!store) {
      throw new NotFoundException('店铺尚未创建,请等待审核通过');
    }
    const hours = await this.hourRepo.find({ where: { storeId: store.storeId } });
    const areas = await this.areaRepo.find({ where: { storeId: store.storeId } });
    const avatarUrl = await this.fileService.resolveUrl(store.avatarFileId);
    return {
      storeId: store.storeId,
      merchantId: store.merchantId,
      name: store.name,
      avatarFileId: store.avatarFileId,
      avatarUrl,
      intro: store.intro,
      businessScope: store.businessScope,
      businessStatus: store.businessStatus,
      minOrderAmount: store.minOrderAmount,
      deliveryFee: store.deliveryFee,
      notice: store.notice,
      cityCode: store.cityCode,
      businessHours: hours.map((h) => ({
        dayOfWeek: h.dayOfWeek,
        startTime: h.startTime,
        endTime: h.endTime,
      })),
      deliveryAreas: areas.map((a) => ({
        geometry: a.geometry,
        minOrderAmount: Number(a.minOrderAmount),
        deliveryFee: Number(a.deliveryFee),
      })),
    };
  }

  async updateSettings(merchantId: string, dto: UpdateStoreSettingsDto): Promise<UpdateStoreSettingsVo> {
    const store = await this.storeRepo.findOne({ where: { merchantId } });
    if (!store) {
      throw new NotFoundException('店铺尚未创建');
    }
    const merchant = await this.merchantRepo.findOne({ where: { merchantId } });
    if (!merchant || merchant.accountStatus !== 'active') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '账号未激活,无法编辑店铺',
      });
    }

    const result = await this.dataSource.transaction(async (em) => {
      const sRepo = em.getRepository(Store);
      const hRepo = em.getRepository(StoreBusinessHour);
      const aRepo = em.getRepository(StoreDeliveryArea);
      const now = String(Date.now());

      const patch: Partial<Store> = { updatedAt: now };
      if (dto.avatarFileId !== undefined) patch.avatarFileId = dto.avatarFileId;
      if (dto.name !== undefined) patch.name = dto.name;
      if (dto.intro !== undefined) patch.intro = dto.intro;
      if (dto.minOrderAmount !== undefined) patch.minOrderAmount = String(dto.minOrderAmount);
      if (dto.deliveryFee !== undefined) patch.deliveryFee = String(dto.deliveryFee);
      if (dto.notice !== undefined) patch.notice = dto.notice;
      await sRepo.update({ storeId: store.storeId }, patch);

      if (dto.businessHours) {
        await hRepo.delete({ storeId: store.storeId });
        for (const h of dto.businessHours) {
          await hRepo.insert({
            storeId: store.storeId,
            dayOfWeek: h.dayOfWeek,
            startTime: h.startTime.length === 5 ? `${h.startTime}:00` : h.startTime,
            endTime: h.endTime.length === 5 ? `${h.endTime}:00` : h.endTime,
          });
        }
      }

      if (dto.deliveryAreas) {
        await aRepo.delete({ storeId: store.storeId });
        for (const a of dto.deliveryAreas) {
          await aRepo.insert({
            storeId: store.storeId,
            geometry: a.geometry,
            minOrderAmount: String(a.minOrderAmount),
            deliveryFee: String(a.deliveryFee),
            createdAt: now,
          });
        }
      }

      return { storeId: store.storeId, updatedAt: Number(now) };
    });

    return result;
  }

  async setBusinessStatus(merchantId: string, dto: SetBusinessStatusDto): Promise<SetBusinessStatusVo> {
    const store = await this.storeRepo.findOne({ where: { merchantId } });
    if (!store) {
      throw new NotFoundException('店铺尚未创建');
    }
    if (store.businessStatus === 'paused') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '店铺被平台强制下线,请联系客服解除',
      });
    }
    const before = store.businessStatus;
    const after = dto.businessStatus as StoreBusinessStatus;
    if (before === after) {
      return { storeId: store.storeId, businessStatus: after, effectiveAt: Number(store.updatedAt) };
    }
    const now = String(Date.now());
    await this.storeRepo.update({ storeId: store.storeId }, { businessStatus: after, updatedAt: now });
    await this.eventBus.publish(
      EventName.StoreStatusChanged,
      {
        storeId: store.storeId,
        merchantId: store.merchantId,
        beforeStatus: before,
        afterStatus: after,
        effectiveAt: Number(now),
        operatorType: 'merchant',
        reason: dto.reason,
      },
      { bizType: 'store', bizId: store.storeId },
    );
    return { storeId: store.storeId, businessStatus: after, effectiveAt: Number(now) };
  }

  /** 平台 Web 强制改 store.business_status(走 admin-merchant 模块调用) */
  async forceSetStatus(
    storeId: string,
    targetStatus: StoreBusinessStatus,
    operatorId: string,
    reason: string | undefined,
  ): Promise<{ storeId: string; businessStatus: string }> {
    const store = await this.storeRepo.findOne({ where: { storeId } });
    if (!store) throw new NotFoundException('store not found');
    if (store.businessStatus === targetStatus) {
      return { storeId, businessStatus: targetStatus };
    }
    const now = String(Date.now());
    await this.storeRepo.update({ storeId }, { businessStatus: targetStatus, updatedAt: now });
    await this.eventBus.publish(
      EventName.StoreStatusChanged,
      {
        storeId,
        merchantId: store.merchantId,
        beforeStatus: store.businessStatus,
        afterStatus: targetStatus,
        effectiveAt: Number(now),
        operatorType: 'admin',
        reason,
      },
      { bizType: 'store', bizId: storeId },
    );
    void operatorId;
    return { storeId, businessStatus: targetStatus };
  }
}
