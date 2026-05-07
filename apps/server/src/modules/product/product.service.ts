import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { DataSource, In, MoreThan, Repository } from 'typeorm';

import {
  FileObject,
  MerchantPromotion,
  Product,
  ProductCategory,
  type ProductSaleStatus,
  ProductSku,
  Store,
} from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { FileService } from '../file/file.service';

import {
  BatchSaleStatusDto,
  CategoryVo,
  CreateCategoryDto,
  CreateProductDto,
  CreateProductVo,
  ListProductsQueryDto,
  ProductPageVo,
  SaleStatusDto,
  SaleStatusVo,
  UpdateCategoryDto,
  UpdateProductDto,
} from './product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(ProductCategory) private readonly catRepo: Repository<ProductCategory>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductSku) private readonly skuRepo: Repository<ProductSku>,
    @InjectRepository(MerchantPromotion) private readonly promoRepo: Repository<MerchantPromotion>,
    @InjectRepository(FileObject) private readonly fileRepo: Repository<FileObject>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventBus: DomainEventBus,
    private readonly fileService: FileService,
  ) {}

  /**
   * 批量取 fileId → url 映射(coverImageFileId 反查)
   * 改为走 FileService.resolveUrls,自动 lazy 重签过期 presigned URL.
   */
  private async resolveFileUrls(fileIds: Array<string | null | undefined>): Promise<Map<string, string>> {
    const obj = await this.fileService.resolveUrls(fileIds);
    const map = new Map<string, string>();
    for (const [k, v] of Object.entries(obj)) {
      if (v) map.set(k, v);
    }
    return map;
  }

  // ============= 分类 =============

  async listCategories(merchantId: string): Promise<CategoryVo[]> {
    const store = await this.requireOwnStore(merchantId);
    const rows = await this.catRepo.find({
      where: { storeId: store.storeId },
      order: { displayOrder: 'ASC' },
    });
    return rows.map((c) => ({
      categoryId: c.categoryId,
      storeId: c.storeId,
      name: c.name,
      displayOrder: c.displayOrder,
    }));
  }

  async createCategory(merchantId: string, dto: CreateCategoryDto): Promise<CategoryVo> {
    const store = await this.requireOwnStore(merchantId);
    const now = String(Date.now());
    const saved = await this.catRepo.save(
      this.catRepo.create({
        storeId: store.storeId,
        name: dto.name,
        displayOrder: dto.displayOrder ?? 0,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return {
      categoryId: saved.categoryId,
      storeId: saved.storeId,
      name: saved.name,
      displayOrder: saved.displayOrder,
    };
  }

  async updateCategory(merchantId: string, categoryId: string, dto: UpdateCategoryDto): Promise<CategoryVo> {
    const cat = await this.catRepo.findOne({ where: { categoryId } });
    if (!cat) throw new NotFoundException('category not found');
    await this.requireOwnStoreById(merchantId, cat.storeId);
    const now = String(Date.now());
    if (dto.name !== undefined) cat.name = dto.name;
    if (dto.displayOrder !== undefined) cat.displayOrder = dto.displayOrder;
    cat.updatedAt = now;
    await this.catRepo.save(cat);
    return {
      categoryId: cat.categoryId,
      storeId: cat.storeId,
      name: cat.name,
      displayOrder: cat.displayOrder,
    };
  }

  async deleteCategory(merchantId: string, categoryId: string): Promise<void> {
    const cat = await this.catRepo.findOne({ where: { categoryId } });
    if (!cat) throw new NotFoundException('category not found');
    await this.requireOwnStoreById(merchantId, cat.storeId);
    // 校验该分类下无商品
    const productCount = await this.productRepo.count({ where: { categoryId } });
    if (productCount > 0) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '该分类下还有商品,请先转移或删除',
      });
    }
    await this.catRepo.delete({ categoryId });
  }

  // ============= 商品 =============

  async listProducts(merchantId: string, query: ListProductsQueryDto): Promise<ProductPageVo> {
    const store = await this.requireOwnStore(merchantId);
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.productRepo.createQueryBuilder('p').where('p.store_id = :storeId', { storeId: store.storeId });
    if (query.categoryId) qb.andWhere('p.category_id = :cid', { cid: query.categoryId });
    if (query.saleStatus) qb.andWhere('p.sale_status = :ss', { ss: query.saleStatus });
    if (query.keyword) qb.andWhere('p.name LIKE :kw', { kw: `%${query.keyword}%` });
    qb.orderBy('p.created_at', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    const fileUrlMap = await this.resolveFileUrls(rows.map((p) => p.coverImageFileId));
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
        saleStatus: p.saleStatus,
        hasSku: p.hasSku,
        coverImageFileId: p.coverImageFileId,
        imageUrl: p.coverImageFileId ? (fileUrlMap.get(p.coverImageFileId) ?? null) : null,
      })),
    };
  }

  async createProduct(merchantId: string, dto: CreateProductDto): Promise<CreateProductVo> {
    const store = await this.requireOwnStore(merchantId);
    const cat = await this.catRepo.findOne({ where: { categoryId: dto.categoryId } });
    if (!cat || cat.storeId !== store.storeId) {
      throw new UnprocessableEntityException({ code: ErrorCode.STATUS_INVALID, message: '分类不存在或不属于本店' });
    }

    // 校验:hasSku=1 时必须传 skus;hasSku=0 时必须传 price/stock
    if (dto.hasSku === 1) {
      if (!dto.skus || dto.skus.length === 0) {
        throw new UnprocessableEntityException({
          code: ErrorCode.INVALID_PARAM,
          message: '多规格商品必须至少 1 个 SKU',
        });
      }
    } else if (dto.price === undefined || dto.stock === undefined) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        message: '无规格商品必须传 price 和 stock',
      });
    }

    const result = await this.dataSource.transaction(async (em) => {
      const pRepo = em.getRepository(Product);
      const sRepo = em.getRepository(ProductSku);
      const now = String(Date.now());

      let aggregatedPrice: number;
      let aggregatedStock: number;
      if (dto.hasSku === 1 && dto.skus) {
        aggregatedPrice = Math.min(...dto.skus.map((s) => s.price));
        aggregatedStock = dto.skus.reduce((sum, s) => sum + s.stock, 0);
      } else {
        aggregatedPrice = dto.price ?? 0;
        aggregatedStock = dto.stock ?? 0;
      }

      const initialStatus: ProductSaleStatus = dto.saleStatus ?? 'draft';

      const product = await pRepo.save(
        pRepo.create({
          storeId: store.storeId,
          categoryId: dto.categoryId,
          name: dto.name,
          description: dto.description ?? null,
          coverImageFileId: dto.coverImageFileId ?? null,
          images: dto.images ?? null,
          price: String(aggregatedPrice),
          originalPrice: null,
          stock: aggregatedStock,
          stockAlertThreshold: dto.stockAlertThreshold ?? 5,
          hasSku: dto.hasSku,
          saleStatus: initialStatus,
          createdAt: now,
          updatedAt: now,
        }),
      );

      if (dto.hasSku === 1 && dto.skus) {
        for (const s of dto.skus) {
          await sRepo.insert({
            productId: product.productId,
            specValue: s.specValue,
            price: String(s.price),
            stock: s.stock,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      return product;
    });

    await this.eventBus.publish(
      EventName.ProductCreated,
      {
        productId: result.productId,
        storeId: result.storeId,
        categoryId: result.categoryId,
        createdAt: Number(result.createdAt),
      },
      { bizType: 'product', bizId: result.productId },
    );
    if (result.saleStatus === 'on_shelf') {
      await this.eventBus.publish(
        EventName.ProductOnSale,
        {
          productId: result.productId,
          storeId: result.storeId,
          saleStatus: 'on_shelf',
          changedAt: Number(result.createdAt),
        },
        { bizType: 'product', bizId: result.productId },
      );
    }

    return {
      productId: result.productId,
      saleStatus: result.saleStatus,
      createdAt: Number(result.createdAt),
    };
  }

  async getProductDetail(
    merchantId: string,
    productId: string,
  ): Promise<Product & { skus: ProductSku[]; imageUrl: string | null }> {
    const product = await this.productRepo.findOne({ where: { productId } });
    if (!product) throw new NotFoundException('product not found');
    await this.requireOwnStoreById(merchantId, product.storeId);
    const skus = await this.skuRepo.find({ where: { productId } });
    const fileUrlMap = await this.resolveFileUrls([product.coverImageFileId]);
    const imageUrl = product.coverImageFileId ? (fileUrlMap.get(product.coverImageFileId) ?? null) : null;
    return { ...product, skus, imageUrl };
  }

  async updateProduct(merchantId: string, productId: string, dto: UpdateProductDto): Promise<{ productId: string }> {
    const product = await this.productRepo.findOne({ where: { productId } });
    if (!product) throw new NotFoundException('product not found');
    await this.requireOwnStoreById(merchantId, product.storeId);

    // 校验:active promo 内不能改 price
    if (dto.price !== undefined) {
      const inActivePromo = await this.isProductInActivePromo(productId);
      if (inActivePromo) {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          message: '商品在活动中,不可修改价格',
        });
      }
    }

    const now = String(Date.now());
    const patch: Partial<Product> = { updatedAt: now };
    if (dto.categoryId !== undefined) patch.categoryId = dto.categoryId;
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.coverImageFileId !== undefined) patch.coverImageFileId = dto.coverImageFileId;
    if (dto.images !== undefined) patch.images = dto.images;
    if (dto.price !== undefined) patch.price = String(dto.price);
    if (dto.stock !== undefined) patch.stock = dto.stock;
    if (dto.stockAlertThreshold !== undefined) patch.stockAlertThreshold = dto.stockAlertThreshold;
    await this.productRepo.update({ productId }, patch);
    return { productId };
  }

  async setSaleStatus(merchantId: string, productId: string, dto: SaleStatusDto): Promise<SaleStatusVo> {
    const product = await this.productRepo.findOne({ where: { productId } });
    if (!product) throw new NotFoundException('product not found');
    await this.requireOwnStoreById(merchantId, product.storeId);

    if (product.saleStatus === dto.saleStatus) {
      return { productId, saleStatus: product.saleStatus, updatedAt: Number(product.updatedAt) };
    }

    const now = String(Date.now());
    await this.productRepo.update({ productId }, { saleStatus: dto.saleStatus, updatedAt: now });
    await this.eventBus.publish(
      EventName.ProductOnSale,
      {
        productId,
        storeId: product.storeId,
        saleStatus: dto.saleStatus,
        changedAt: Number(now),
      },
      { bizType: 'product', bizId: productId },
    );
    void dto.reason;
    return { productId, saleStatus: dto.saleStatus, updatedAt: Number(now) };
  }

  async batchSetSaleStatus(merchantId: string, dto: BatchSaleStatusDto): Promise<{ updated: number }> {
    const store = await this.requireOwnStore(merchantId);
    const products = await this.productRepo.find({ where: { productId: In(dto.productIds) } });
    if (products.some((p) => p.storeId !== store.storeId)) {
      throw new ForbiddenException('部分商品不属于本店');
    }
    const now = String(Date.now());
    let updated = 0;
    for (const p of products) {
      if (p.saleStatus === dto.saleStatus) continue;
      await this.productRepo.update({ productId: p.productId }, { saleStatus: dto.saleStatus, updatedAt: now });
      await this.eventBus.publish(
        EventName.ProductOnSale,
        {
          productId: p.productId,
          storeId: p.storeId,
          saleStatus: dto.saleStatus,
          changedAt: Number(now),
        },
        { bizType: 'product', bizId: p.productId },
      );
      updated++;
    }
    return { updated };
  }

  // ============= 内部辅助 =============

  /** 校验 store 归属并返回 store(供其他模块复用) */
  async requireOwnStore(merchantId: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { merchantId } });
    if (!store) throw new ForbiddenException('店铺不存在');
    return store;
  }

  private async requireOwnStoreById(merchantId: string, storeId: string): Promise<void> {
    const store = await this.storeRepo.findOne({ where: { storeId } });
    if (!store || store.merchantId !== merchantId) {
      throw new ForbiddenException('cannot access another store');
    }
  }

  private async isProductInActivePromo(productId: string): Promise<boolean> {
    const now = String(Date.now());
    const promos = await this.promoRepo.find({
      where: { status: 'active', endTime: MoreThan(now) },
    });
    return promos.some((p) => Array.isArray(p.productIds) && p.productIds.includes(productId));
  }
}
