import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { CitySite, PlatformCategory, Store } from '../../database/entities';

import {
  type FoodHomeBannerVo,
  type FoodHomeCategoryVo,
  type FoodHomeRecommendedStoreVo,
  type FoodHomeVo,
} from './food-home.dto';

const MAX_RECOMMENDED_STORES = 10;

@Injectable()
export class FoodHomeService {
  constructor(
    @InjectRepository(CitySite) private readonly cityRepo: Repository<CitySite>,
    @InjectRepository(PlatformCategory) private readonly categoryRepo: Repository<PlatformCategory>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
  ) {}

  async getHome(cityCode: string, lng?: number, lat?: number): Promise<FoodHomeVo> {
    // 1. 校验 cityCode 合法且已开通
    const city = await this.cityRepo.findOne({ where: { cityCode } });
    if (!city || !city.serviceEnabled) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'CITY_NOT_AVAILABLE',
        message: '该城市暂未开通服务',
      });
    }

    // 2. banners — stage 5 暂不接 CMS,返空数组(stage 9+ 真接)
    const banners: FoodHomeBannerVo[] = [];

    // 3. categories — 取 takeaway 顶级类目(parentId=0,enabled=1),按 displayOrder
    const cats = await this.categoryRepo
      .createQueryBuilder('c')
      .where('c.biz_type = :bt', { bt: 'takeaway' })
      .andWhere('c.parent_id = 0')
      .andWhere('c.enabled = 1')
      .orderBy('c.display_order', 'ASC')
      .getMany();
    const categories: FoodHomeCategoryVo[] = cats.map((c) => ({
      categoryId: c.categoryId,
      name: c.name,
      iconUrl: c.iconUrl,
    }));

    // 4. recommendedStores — 同城 online 店铺,按更新时间倒序取前 10
    const stores = await this.storeRepo
      .createQueryBuilder('s')
      .where('s.city_code = :cc', { cc: cityCode })
      .andWhere("s.business_status = 'online'")
      .orderBy('s.updated_at', 'DESC')
      .limit(MAX_RECOMMENDED_STORES)
      .getMany();

    const recommendedStores: FoodHomeRecommendedStoreVo[] = stores.map((s) => ({
      storeId: s.storeId,
      name: s.name,
      iconUrl: s.avatarFileId,
      distance: this.mockDistance(lng, lat),
      sales: 0,
      rating: 5,
      deliveryFee: s.deliveryFee,
      minOrderAmount: s.minOrderAmount,
      businessStatus: s.businessStatus,
    }));

    return {
      cityCode,
      banners,
      categories,
      activityEntries: [],
      recommendedStores,
    };
  }

  /** stage 5 mock:有经纬度时返 1500m 占位,无则 null。stage 8 接 amap-distance.adapter */
  private mockDistance(lng?: number, lat?: number): number | null {
    if (lng == null || lat == null) return null;
    return 1500;
  }
}
