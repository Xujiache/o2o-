import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Store } from '../../database/entities';

import {
  type FoodStoreItemVo,
  type FoodStoreListPageVo,
  type FoodStoreSort,
  type ListStoresQueryDto,
} from './store-query.dto';

@Injectable()
export class StoreQueryService {
  constructor(@InjectRepository(Store) private readonly storeRepo: Repository<Store>) {}

  async list(query: ListStoresQueryDto): Promise<FoodStoreListPageVo> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sort: FoodStoreSort = query.sort ?? 'recent';

    let qb = this.storeRepo.createQueryBuilder('s').where('s.city_code = :cc', { cc: query.cityCode });

    if (query.keyword) {
      qb = qb.andWhere('(s.name LIKE :kw OR s.intro LIKE :kw)', { kw: `%${query.keyword}%` });
    }
    // categoryId 本阶段忽略(stage 5 platform_category 与 store 间无映射表;DESIGN 标注 stage 6/9 接)
    // sort: distance/sales/rating 本阶段无真实数据,统一退化为 updated_at DESC(mock)
    qb = qb
      .orderBy("CASE WHEN s.business_status = 'online' THEN 0 ELSE 1 END", 'ASC')
      .addOrderBy('s.updated_at', 'DESC');
    void sort;

    const total = await qb.getCount();
    const stores = await qb
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const list: FoodStoreItemVo[] = stores.map((s) => ({
      storeId: s.storeId,
      name: s.name,
      iconUrl: s.avatarFileId,
      intro: s.intro,
      distance: this.mockDistance(query.lng, query.lat),
      sales: 0,
      rating: 5,
      deliveryFee: s.deliveryFee,
      minOrderAmount: s.minOrderAmount,
      businessStatus: s.businessStatus,
      statusUpdatedAt: Number(s.updatedAt),
    }));

    return { pageNo, pageSize, total, list };
  }

  /** stage 5 mock,stage 8 真接 amap-distance.adapter */
  private mockDistance(lng?: number, lat?: number): number | null {
    if (lng == null || lat == null) return null;
    return 1500;
  }
}
