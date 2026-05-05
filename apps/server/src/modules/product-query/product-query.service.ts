import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { MerchantPromotion, Product, ProductCategory, ProductSku, Store } from '../../database/entities';

import {
  type FoodProductCategoryVo,
  type FoodProductVo,
  type FoodPromoVo,
  type FoodSkuVo,
  type FoodStoreProductsVo,
} from './product-query.dto';

@Injectable()
export class ProductQueryService {
  constructor(
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductSku) private readonly skuRepo: Repository<ProductSku>,
    @InjectRepository(ProductCategory) private readonly categoryRepo: Repository<ProductCategory>,
    @InjectRepository(MerchantPromotion) private readonly promotionRepo: Repository<MerchantPromotion>,
  ) {}

  async getProducts(storeId: string): Promise<FoodStoreProductsVo> {
    // 1. 校验店铺存在 + online
    const store = await this.storeRepo.findOne({ where: { storeId } });
    if (!store) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'store not found' });
    if (store.businessStatus !== 'online') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'STORE_NOT_OPEN',
        message: '店铺当前未营业',
      });
    }

    // 2. categories
    const categoryRows = await this.categoryRepo.find({ where: { storeId } });
    const categories: FoodProductCategoryVo[] = categoryRows
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((c) => ({ categoryId: c.categoryId, name: c.name, displayOrder: c.displayOrder }));

    // 3. products(在售)+ skus(批量查)
    const productRows = await this.productRepo.find({ where: { storeId } });
    const onShelf = productRows.filter((p) => p.saleStatus === 'on_shelf' || p.saleStatus === 'sold_out');
    const productIds = onShelf.map((p) => p.productId);
    const skuRows = productIds.length
      ? await this.skuRepo.createQueryBuilder('s').where('s.product_id IN (:...ids)', { ids: productIds }).getMany()
      : [];

    const products: FoodProductVo[] = onShelf.map((p) => {
      const skus: FoodSkuVo[] = skuRows
        .filter((s) => s.productId === p.productId)
        .map((s) => ({
          skuId: s.skuId,
          specValue: s.specValue,
          price: s.price,
          availableStock: Math.max(0, s.stock - s.stockLocked),
        }));
      // 计算 saleStatus:已为 on_shelf 但所有 sku 都 availableStock<=0 → sold_out 渲染
      let saleStatus = p.saleStatus;
      if (saleStatus === 'on_shelf') {
        const totalAvail = p.hasSku ? skus.reduce((acc, s) => acc + s.availableStock, 0) : Math.max(0, p.stock - 0); // product 表本身无 stock_locked,sku 才有
        if (totalAvail <= 0) saleStatus = 'sold_out';
      }
      return {
        productId: p.productId,
        name: p.name,
        description: p.description,
        coverImageFileId: p.coverImageFileId,
        basePrice: p.price,
        originalPrice: p.originalPrice,
        saleStatus,
        categoryId: p.categoryId,
        skus,
      };
    });

    // 4. promotions(active 且时间窗口内)
    const now = Date.now();
    const promoRows = await this.promotionRepo.find({ where: { storeId } });
    const promotions: FoodPromoVo[] = promoRows
      .filter((p) => p.status === 'active' && Number(p.startTime) <= now && Number(p.endTime) >= now)
      .map((p) => ({
        promoId: p.promoId,
        promoType: p.promoType,
        name: p.name,
        productIds: p.productIds,
        rules: p.rules,
      }));

    return { storeId, categories, products, promotions };
  }
}
