import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Like, Repository } from 'typeorm';

import { Product, Store } from '../../database/entities';

import type {
  GroceryProductDetailVo,
  GroceryProductItemVo,
  GroceryProductPageVo,
  GroceryShelfDto,
  ListGroceryProductsQueryDto,
  UpsertGroceryProductDto,
} from './grocery-product.dto';

@Injectable()
export class GroceryProductService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
  ) {}

  private toItemVo(p: Product): GroceryProductItemVo {
    return {
      productId: p.productId,
      storeId: p.storeId,
      categoryId: p.categoryId,
      name: p.name,
      coverImageFileId: p.coverImageFileId,
      pricingMode: p.pricingMode,
      weightUnit: p.weightUnit,
      price: p.price,
      unitPricePerJin: p.unitPricePerJin,
      minWeightG: p.minWeightG,
      maxWeightG: p.maxWeightG,
      stock: p.stock,
      sales: 0,
    };
  }

  // ============= Customer =============

  async listForCustomer(query: ListGroceryProductsQueryDto): Promise<GroceryProductPageVo> {
    const pageNo = Math.max(1, Number(query.pageNo) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('p.productType = :pt', { pt: 'grocery' })
      .andWhere('p.saleStatus = :ss', { ss: 'on_shelf' });
    if (query.categoryId) qb.andWhere('p.categoryId = :cid', { cid: query.categoryId });
    if (query.keyword) qb.andWhere('p.name LIKE :kw', { kw: `%${query.keyword}%` });
    switch (query.sort) {
      case 'price_asc':
        qb.orderBy('CAST(p.price AS UNSIGNED)', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('CAST(p.price AS UNSIGNED)', 'DESC');
        break;
      case 'new':
        qb.orderBy('p.createdAt', 'DESC');
        break;
      default:
        qb.orderBy('p.createdAt', 'DESC');
    }
    const [list, total] = await qb
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { items: list.map((p) => this.toItemVo(p)), total, pageNo, pageSize };
  }

  async detailForCustomer(productId: string): Promise<GroceryProductDetailVo> {
    const p = await this.productRepo.findOne({ where: { productId } });
    if (!p || p.productType !== 'grocery') {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'grocery product not found' });
    }
    return {
      ...this.toItemVo(p),
      description: p.description,
      images: p.images,
    };
  }

  // ============= Merchant =============

  private async ownedStore(merchantId: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { merchantId } });
    if (!store) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'store not found' });
    return store;
  }

  async listForMerchant(merchantId: string, query: ListGroceryProductsQueryDto): Promise<GroceryProductPageVo> {
    const store = await this.ownedStore(merchantId);
    const pageNo = Math.max(1, Number(query.pageNo) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const where: Record<string, unknown> = { storeId: store.storeId, productType: 'grocery' };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.keyword) where.name = Like(`%${query.keyword}%`);
    const [list, total] = await this.productRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    return { items: list.map((p) => this.toItemVo(p)), total, pageNo, pageSize };
  }

  async upsertForMerchant(
    merchantId: string,
    productId: string | null,
    dto: UpsertGroceryProductDto,
  ): Promise<GroceryProductItemVo> {
    if (dto.pricingMode === 'weighed') {
      if (!dto.unitPricePerJin || !dto.weightUnit) {
        throw new UnprocessableEntityException({
          code: ErrorCode.INVALID_PARAM,
          message: 'weighed 商品需提供 unitPricePerJin 与 weightUnit',
        });
      }
    } else if (dto.price === undefined) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        message: 'fixed 商品需提供 price',
      });
    }
    const store = await this.ownedStore(merchantId);
    const now = String(Date.now());
    const payload: Partial<Product> = {
      storeId: store.storeId,
      categoryId: dto.categoryId,
      name: dto.name,
      description: dto.description ?? null,
      coverImageFileId: dto.coverImageFileId ?? null,
      images: dto.images ?? null,
      productType: 'grocery',
      pricingMode: dto.pricingMode,
      weightUnit: dto.weightUnit ?? null,
      minWeightG: dto.minWeightG ?? null,
      maxWeightG: dto.maxWeightG ?? null,
      unitPricePerJin: dto.unitPricePerJin != null ? String(dto.unitPricePerJin) : null,
      price: String(dto.price ?? 0),
      stock: dto.stock,
      hasSku: 0,
      saleStatus: 'draft',
      updatedAt: now,
    };
    if (productId) {
      const existing = await this.productRepo.findOne({ where: { productId } });
      if (!existing) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
      if (existing.storeId !== store.storeId) throw new ForbiddenException({ code: ErrorCode.FORBIDDEN });
      await this.productRepo.update({ productId }, payload);
      const refreshed = await this.productRepo.findOne({ where: { productId } });
      return this.toItemVo(refreshed!);
    }
    const saved = await this.productRepo.save(this.productRepo.create({ ...payload, createdAt: now }));
    return this.toItemVo(saved);
  }

  async setShelf(
    merchantId: string,
    productId: string,
    dto: GroceryShelfDto,
  ): Promise<{ productId: string; saleStatus: string }> {
    const store = await this.ownedStore(merchantId);
    const p = await this.productRepo.findOne({ where: { productId } });
    if (!p) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
    if (p.storeId !== store.storeId) throw new ForbiddenException({ code: ErrorCode.FORBIDDEN });
    if (p.productType !== 'grocery') {
      throw new UnprocessableEntityException({ code: ErrorCode.STATUS_INVALID, message: 'not a grocery product' });
    }
    await this.productRepo.update({ productId }, { saleStatus: dto.saleStatus, updatedAt: String(Date.now()) });
    return { productId, saleStatus: dto.saleStatus };
  }
}
