import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Store } from '../../database/entities';
import { FileService } from '../file/file.service';

import {
  type FoodStoreItemVo,
  type FoodStoreListPageVo,
  type FoodStoreSort,
  type ListStoresQueryDto,
} from './store-query.dto';

@Injectable()
export class StoreQueryService {
  constructor(
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    private readonly fileService: FileService,
  ) {}

  async list(query: ListStoresQueryDto): Promise<FoodStoreListPageVo> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sort: FoodStoreSort = query.sort ?? 'recent';

    let qb = this.storeRepo.createQueryBuilder('s').where('s.city_code = :cc', { cc: query.cityCode });

    if (query.keyword) {
      qb = qb.andWhere('(s.name LIKE :kw OR s.intro LIKE :kw)', { kw: `%${query.keyword}%` });
    }
    qb = qb
      .orderBy("CASE WHEN s.business_status = 'online' THEN 0 ELSE 1 END", 'ASC')
      .addOrderBy('s.updated_at', 'DESC');
    void sort;

    const total = await qb.getCount();
    const stores = await qb
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getMany();
    const urlMap = await this.fileService.resolveUrls(stores.map((s) => s.avatarFileId));

    const list: FoodStoreItemVo[] = stores.map((s) => ({
      storeId: s.storeId,
      name: s.name,
      iconUrl: s.avatarFileId ? (urlMap[s.avatarFileId] ?? null) : null,
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

  private mockDistance(lng?: number, lat?: number): number | null {
    if (lng == null || lat == null) return null;
    return 1500;
  }
}
