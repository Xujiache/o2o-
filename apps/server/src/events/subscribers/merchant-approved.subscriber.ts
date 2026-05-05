import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { MerchantAccount, MerchantApplication, ProductCategory, Store } from '../../database/entities';
import { EventName, type MerchantApprovedPayload } from '../events';

@Injectable()
export class MerchantApprovedSubscriber {
  private readonly logger = new Logger(MerchantApprovedSubscriber.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @OnEvent(EventName.MerchantApproved)
  async handle(payload: MerchantApprovedPayload): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      const merchantRepo = em.getRepository(MerchantAccount);
      const appRepo = em.getRepository(MerchantApplication);
      const storeRepo = em.getRepository(Store);
      const catRepo = em.getRepository(ProductCategory);

      const merchant = await merchantRepo.findOne({ where: { merchantId: payload.merchantId } });
      if (!merchant) {
        throw new Error(`merchant ${payload.merchantId} not found`);
      }
      // 幂等:如已建店则跳过
      if (merchant.approvedStoreId) {
        this.logger.warn(
          `[merchant.approved] merchant ${payload.merchantId} already has store ${merchant.approvedStoreId}, skip`,
        );
        return;
      }
      const app = await appRepo.findOne({ where: { applicationId: payload.applicationId } });
      if (!app) throw new Error(`application ${payload.applicationId} not found`);

      const now = String(Date.now());

      const store = await storeRepo.save(
        storeRepo.create({
          merchantId: payload.merchantId,
          name: app.storeName,
          avatarFileId: null,
          intro: null,
          businessScope: app.businessScope,
          businessStatus: 'offline',
          minOrderAmount: '0',
          deliveryFee: '0',
          commissionRate: String(payload.commissionRate),
          notice: null,
          cityCode: null,
          createdAt: now,
          updatedAt: now,
        }),
      );

      await catRepo.insert({
        storeId: store.storeId,
        name: '默认分类',
        displayOrder: 0,
        createdAt: now,
        updatedAt: now,
      });

      await merchantRepo.update({ merchantId: payload.merchantId }, { approvedStoreId: store.storeId, updatedAt: now });

      this.logger.log(
        `[merchant.approved] auto-created store ${store.storeId} + 默认分类 for merchant ${payload.merchantId}`,
      );
    });
  }
}
