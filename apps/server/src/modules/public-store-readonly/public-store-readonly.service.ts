import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MerchantAccount, Product, Store, StoreBusinessHour } from '../../database/entities';

import {
  ListPublicProductsQueryDto,
  ListPublicStoresQueryDto,
  PublicProductPageVo,
  PublicStoreDetailVo,
  PublicStorePageVo,
} from './public-store-readonly.dto';

@Injectable()
export class PublicStoreReadonlyService {
  constructor(
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(StoreBusinessHour) private readonly hourRepo: Repository<StoreBusinessHour>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(MerchantAccount) private readonly merchantRepo: Repository<MerchantAccount>,
  ) {}

  async listStores(query: ListPublicStoresQueryDto): Promise<PublicStorePageVo> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.storeRepo
      .createQueryBuilder('s')
      .innerJoin(MerchantAccount, 'm', 'm.merchant_id = s.merchant_id AND m.account_status = :as', { as: 'active' })
      .where('1 = 1');
    if (query.cityCode) qb.andWhere('s.city_code = :cc', { cc: query.cityCode });
    qb.orderBy("CASE WHEN s.business_status = 'online' THEN 0 ELSE 1 END", 'ASC')
      .addOrderBy('s.updated_at', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    return {
      pageNo,
      pageSize,
      total,
      list: rows.map((s) => ({
        storeId: s.storeId,
        name: s.name,
        avatarFileId: s.avatarFileId,
        businessScope: s.businessScope,
        minOrderAmount: s.minOrderAmount,
        deliveryFee: s.deliveryFee,
        businessStatus: s.businessStatus,
        statusUpdatedAt: Number(s.updatedAt),
      })),
    };
  }

  async getStoreDetail(storeId: string): Promise<PublicStoreDetailVo> {
    const store = await this.storeRepo.findOne({ where: { storeId } });
    if (!store) {
      throw new NotFoundException('store not available');
    }
    const merchant = await this.merchantRepo.findOne({ where: { merchantId: store.merchantId } });
    if (!merchant || merchant.accountStatus !== 'active') {
      throw new NotFoundException('store not available');
    }
    const hours = await this.hourRepo.find({ where: { storeId } });
    return {
      storeId: store.storeId,
      name: store.name,
      avatarFileId: store.avatarFileId,
      businessScope: store.businessScope,
      minOrderAmount: store.minOrderAmount,
      deliveryFee: store.deliveryFee,
      businessStatus: store.businessStatus,
      statusUpdatedAt: Number(store.updatedAt),
      intro: store.intro,
      notice: store.notice,
      businessHours: hours.map((h) => ({
        dayOfWeek: h.dayOfWeek,
        startTime: h.startTime,
        endTime: h.endTime,
      })),
    };
  }

  async listProducts(storeId: string, query: ListPublicProductsQueryDto): Promise<PublicProductPageVo> {
    const store = await this.storeRepo.findOne({ where: { storeId } });
    if (!store) {
      throw new NotFoundException('store not available');
    }
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('p.store_id = :sid AND p.sale_status = :ss', { sid: storeId, ss: 'on_shelf' });
    if (query.categoryId) qb.andWhere('p.category_id = :cid', { cid: query.categoryId });
    qb.orderBy('p.updated_at', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    return {
      pageNo,
      pageSize,
      total,
      list: rows.map((p) => ({
        productId: p.productId,
        storeId: p.storeId,
        categoryId: p.categoryId,
        name: p.name,
        price: p.price,
        stock: p.stock,
        coverImageFileId: p.coverImageFileId,
      })),
    };
  }
}
