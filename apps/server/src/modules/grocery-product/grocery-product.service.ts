import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { plainToInstance } from 'class-transformer';
import { Brackets, DataSource, In, Repository } from 'typeorm';

import { GroceryCategory, GroceryProduct, GroceryProductSku } from '../../database/entities';
import { type GroceryPricedBy } from '../../database/entities/grocery-product.entity';
import { FileService } from '../file/file.service';

import {
  AdjustStockDto,
  AdminGroceryProductVo,
  AdminListGroceryProductsQueryDto,
  AdminListGroceryProductsVo,
  CategoryMutationVo,
  CreateGroceryCategoryDto,
  CreateGroceryProductDto,
  GROCERY_MAX_DETAIL_IMAGES,
  GROCERY_MAX_MAIN_IMAGES,
  GroceryCategoryVo,
  GroceryProductSkuItemDto,
  ListGroceryCategoriesVo,
  ProductMutationVo,
  PublicGroceryProductVo,
  PublicGrocerySkuVo,
  PublicListGroceryProductsQueryDto,
  PublicListGroceryProductsVo,
  ShelfActionDto,
  UpdateGroceryCategoryDto,
  UpdateGroceryProductDto,
} from './grocery-product.dto';

@Injectable()
export class GroceryProductService {
  constructor(
    @InjectRepository(GroceryCategory) private readonly catRepo: Repository<GroceryCategory>,
    @InjectRepository(GroceryProduct) private readonly prodRepo: Repository<GroceryProduct>,
    @InjectRepository(GroceryProductSku) private readonly skuRepo: Repository<GroceryProductSku>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly fileService: FileService,
  ) {}

  async listCategoriesPublic(): Promise<ListGroceryCategoriesVo> {
    const items = await this.catRepo
      .createQueryBuilder('c')
      .where('c.status = :st', { st: 'active' })
      .orderBy('c.display_order', 'ASC')
      .addOrderBy('c.category_id', 'ASC')
      .getMany();
    return { list: items.map((c) => this.toCategoryVo(c)) };
  }

  async listCategoriesAdmin(): Promise<ListGroceryCategoriesVo> {
    const items = await this.catRepo
      .createQueryBuilder('c')
      .orderBy('c.display_order', 'ASC')
      .addOrderBy('c.category_id', 'ASC')
      .getMany();
    return { list: items.map((c) => this.toCategoryVo(c)) };
  }

  async createCategory(dto: CreateGroceryCategoryDto): Promise<CategoryMutationVo> {
    const now = String(Date.now());
    const e = this.catRepo.create({
      name: dto.name,
      iconFileId: dto.iconFileId ?? null,
      displayOrder: dto.displayOrder ?? 0,
      status: dto.status ?? 'active',
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.catRepo.save(e);
    return { categoryId: saved.categoryId, updatedAt: saved.updatedAt };
  }

  async updateCategory(categoryId: string, dto: UpdateGroceryCategoryDto): Promise<CategoryMutationVo> {
    const c = await this.catRepo.findOne({ where: { categoryId } });
    if (!c) throw new NotFoundException('category not found');
    const now = String(Date.now());
    const patch: Partial<GroceryCategory> = { updatedAt: now };
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.iconFileId !== undefined) patch.iconFileId = dto.iconFileId;
    if (dto.displayOrder !== undefined) patch.displayOrder = dto.displayOrder;
    if (dto.status !== undefined) patch.status = dto.status;
    await this.catRepo.update({ categoryId }, patch);
    return { categoryId, updatedAt: now };
  }

  async deleteCategory(categoryId: string): Promise<CategoryMutationVo> {
    const c = await this.catRepo.findOne({ where: { categoryId } });
    if (!c) throw new NotFoundException('category not found');
    const cnt = await this.prodRepo.count({ where: { categoryId } });
    if (cnt > 0) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: 'category has products',
      });
    }
    const now = String(Date.now());
    await this.catRepo.update({ categoryId }, { status: 'inactive', updatedAt: now });
    return { categoryId, updatedAt: now };
  }

  async listProductsPublic(query: PublicListGroceryProductsQueryDto): Promise<PublicListGroceryProductsVo> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.prodRepo
      .createQueryBuilder('p')
      .where('p.sale_status IN (:...st)', { st: ['on_shelf', 'sold_out'] });
    if (query.categoryId) qb.andWhere('p.category_id = :cid', { cid: query.categoryId });
    if (query.keyword) {
      const kw = query.keyword.trim();
      qb.andWhere(
        new Brackets((sub) => {
          sub.where('p.name LIKE :kw', { kw: `%${kw}%` });
        }),
      );
    }
    qb.orderBy("CASE WHEN p.sale_status = 'on_shelf' THEN 0 ELSE 1 END", 'ASC')
      .addOrderBy('p.product_id', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    const list = await this.toPublicVoBatch(items);
    return { pageNo, pageSize, total, list };
  }

  async detailPublic(productId: string): Promise<PublicGroceryProductVo> {
    const p = await this.prodRepo.findOne({ where: { productId } });
    if (!p || p.saleStatus === 'off_shelf') {
      throw new NotFoundException('product not found');
    }
    const list = await this.toPublicVoBatch([p]);
    if (list.length === 0) throw new NotFoundException('product not found');
    return list[0]!;
  }

  async listProductsAdmin(query: AdminListGroceryProductsQueryDto): Promise<AdminListGroceryProductsVo> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.prodRepo.createQueryBuilder('p');
    if (query.saleStatus) qb.andWhere('p.sale_status = :st', { st: query.saleStatus });
    if (query.categoryId) qb.andWhere('p.category_id = :cid', { cid: query.categoryId });
    if (query.keyword) {
      const kw = query.keyword.trim();
      qb.andWhere(
        new Brackets((sub) => {
          sub.where('p.name LIKE :kw', { kw: `%${kw}%` });
        }),
      );
    }
    qb.orderBy('p.product_id', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    const publics = await this.toPublicVoBatch(items);
    const list = publics.map((vo, idx) => {
      const src = items[idx]!;
      return plainToInstance(
        AdminGroceryProductVo,
        { ...vo, createdAt: src.createdAt, updatedAt: src.updatedAt },
        { excludeExtraneousValues: true },
      );
    });
    const cats = await this.catRepo.find();
    const categoryNames: Record<string, string> = {};
    for (const c of cats) categoryNames[c.categoryId] = c.name;
    return { pageNo, pageSize, total, list, categoryNames };
  }

  async createProduct(dto: CreateGroceryProductDto): Promise<ProductMutationVo> {
    const cat = await this.catRepo.findOne({ where: { categoryId: dto.categoryId } });
    if (!cat) {
      throw new UnprocessableEntityException({ code: ErrorCode.INVALID_PARAM, message: 'categoryId not found' });
    }
    const pricedBy: GroceryPricedBy = dto.pricedBy ?? 'weight';
    this.assertSkuPayload(pricedBy, dto.skus);
    this.assertImageLimits(dto.mainImageFileIds, dto.detailImageFileIds);

    const now = String(Date.now());
    let savedId = '';
    let updatedAt = now;

    await this.dataSource.transaction(async (em) => {
      const prodRepo = em.getRepository(GroceryProduct);
      const skuRepo = em.getRepository(GroceryProductSku);
      const mainImages = dto.mainImageFileIds && dto.mainImageFileIds.length > 0 ? dto.mainImageFileIds : null;
      const detailImages = dto.detailImageFileIds && dto.detailImageFileIds.length > 0 ? dto.detailImageFileIds : null;
      const coverFallback = dto.coverImageFileId ?? mainImages?.[0] ?? null;

      const aggregated = this.aggregateSkuStockAndPrice(pricedBy, dto.skus);
      const entity = prodRepo.create({
        categoryId: dto.categoryId,
        name: dto.name,
        coverImageFileId: coverFallback,
        mainImageFileIds: mainImages,
        detailImageFileIds: detailImages,
        description: dto.description ?? null,
        tags: dto.tags && dto.tags.length > 0 ? dto.tags : null,
        isWeighted: dto.isWeighted === false ? 0 : 1,
        pricedBy,
        unitPriceCentsPerJin: String(pricedBy === 'sku' ? aggregated.minPriceCents : dto.unitPriceCentsPerJin),
        estimatedWeightGrams: dto.estimatedWeightGrams ?? 500,
        stockJin: String(pricedBy === 'sku' ? aggregated.totalStock : (dto.initialStockJin ?? 0)),
        deliveryMethods: dto.deliveryMethods && dto.deliveryMethods.length > 0 ? dto.deliveryMethods : null,
        priceDisplayRule: dto.priceDisplayRule ?? 'starting',
        saleStatus: dto.saleStatus ?? 'on_shelf',
        hasTraceability: dto.hasTraceability ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      });
      const saved = await prodRepo.save(entity);
      savedId = saved.productId;
      updatedAt = saved.updatedAt;

      if (pricedBy === 'sku' && dto.skus) {
        await this.persistSkus(skuRepo, savedId, dto.skus, [], now);
      }
    });

    return { productId: savedId, updatedAt };
  }

  async updateProduct(productId: string, dto: UpdateGroceryProductDto): Promise<ProductMutationVo> {
    const p = await this.prodRepo.findOne({ where: { productId } });
    if (!p) throw new NotFoundException('product not found');

    const nextPricedBy: GroceryPricedBy = dto.pricedBy ?? p.pricedBy;
    if (dto.skus !== undefined || dto.pricedBy !== undefined) {
      this.assertSkuPayload(nextPricedBy, dto.skus);
    }
    this.assertImageLimits(dto.mainImageFileIds, dto.detailImageFileIds);
    if (dto.categoryId !== undefined) {
      const cat = await this.catRepo.findOne({ where: { categoryId: dto.categoryId } });
      if (!cat) {
        throw new UnprocessableEntityException({ code: ErrorCode.INVALID_PARAM, message: 'categoryId not found' });
      }
    }

    const now = String(Date.now());

    await this.dataSource.transaction(async (em) => {
      const prodRepo = em.getRepository(GroceryProduct);
      const skuRepo = em.getRepository(GroceryProductSku);
      const patch: Partial<GroceryProduct> = { updatedAt: now };

      if (dto.categoryId !== undefined) patch.categoryId = dto.categoryId;
      if (dto.name !== undefined) patch.name = dto.name;
      if (dto.coverImageFileId !== undefined) patch.coverImageFileId = dto.coverImageFileId;
      if (dto.mainImageFileIds !== undefined) {
        patch.mainImageFileIds = dto.mainImageFileIds.length > 0 ? dto.mainImageFileIds : null;
        if (dto.coverImageFileId === undefined) {
          patch.coverImageFileId = dto.mainImageFileIds[0] ?? null;
        }
      }
      if (dto.detailImageFileIds !== undefined) {
        patch.detailImageFileIds = dto.detailImageFileIds.length > 0 ? dto.detailImageFileIds : null;
      }
      if (dto.description !== undefined) patch.description = dto.description;
      if (dto.tags !== undefined) patch.tags = dto.tags.length > 0 ? dto.tags : null;
      if (dto.isWeighted !== undefined) patch.isWeighted = dto.isWeighted ? 1 : 0;
      if (dto.pricedBy !== undefined) patch.pricedBy = dto.pricedBy;
      if (dto.unitPriceCentsPerJin !== undefined) patch.unitPriceCentsPerJin = String(dto.unitPriceCentsPerJin);
      if (dto.estimatedWeightGrams !== undefined) patch.estimatedWeightGrams = dto.estimatedWeightGrams;
      if (dto.deliveryMethods !== undefined) {
        patch.deliveryMethods = dto.deliveryMethods.length > 0 ? dto.deliveryMethods : null;
      }
      if (dto.priceDisplayRule !== undefined) patch.priceDisplayRule = dto.priceDisplayRule;
      if (dto.saleStatus !== undefined) patch.saleStatus = dto.saleStatus;
      if (dto.hasTraceability !== undefined) patch.hasTraceability = dto.hasTraceability ? 1 : 0;

      if (dto.skus !== undefined && nextPricedBy === 'sku') {
        const existing = await skuRepo.find({ where: { productId } });
        await this.persistSkus(skuRepo, productId, dto.skus, existing, now);
        const aggregated = this.aggregateSkuStockAndPrice('sku', dto.skus);
        patch.unitPriceCentsPerJin = String(aggregated.minPriceCents);
        patch.stockJin = String(aggregated.totalStock);
      } else if (dto.pricedBy !== undefined && dto.pricedBy !== 'sku') {
        await skuRepo.delete({ productId });
      }

      await prodRepo.update({ productId }, patch);
    });

    return { productId, updatedAt: now };
  }

  async setShelf(productId: string, dto: ShelfActionDto): Promise<ProductMutationVo> {
    const p = await this.prodRepo.findOne({ where: { productId } });
    if (!p) throw new NotFoundException('product not found');
    const now = String(Date.now());
    await this.prodRepo.update({ productId }, { saleStatus: dto.action, updatedAt: now });
    return { productId, updatedAt: now };
  }

  async adjustStock(productId: string, dto: AdjustStockDto): Promise<ProductMutationVo> {
    const p = await this.prodRepo.findOne({ where: { productId } });
    if (!p) throw new NotFoundException('product not found');
    if (p.pricedBy === 'sku') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: 'sku-priced product must adjust per-sku stock via edit dialog',
      });
    }
    const cur = Number(p.stockJin);
    const next = cur + dto.deltaJin;
    if (next < 0) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: 'stock would go negative',
      });
    }
    const now = String(Date.now());
    const saleStatus = next === 0 && p.saleStatus === 'on_shelf' ? 'sold_out' : p.saleStatus;
    await this.prodRepo.update({ productId }, { stockJin: next.toFixed(2), saleStatus, updatedAt: now });
    return { productId, updatedAt: now };
  }

  // ============================== private helpers ==============================

  private toCategoryVo(c: GroceryCategory): GroceryCategoryVo {
    return plainToInstance(
      GroceryCategoryVo,
      {
        categoryId: c.categoryId,
        name: c.name,
        iconFileId: c.iconFileId,
        displayOrder: c.displayOrder,
        status: c.status,
      },
      { excludeExtraneousValues: true },
    );
  }

  /** 批量产出 PublicGroceryProductVo,集中解析图片 URL + 加载 SKU,避免 N+1 */
  private async toPublicVoBatch(rows: GroceryProduct[]): Promise<PublicGroceryProductVo[]> {
    if (rows.length === 0) return [];
    const allFileIds: Array<string | null | undefined> = [];
    for (const p of rows) {
      if (p.coverImageFileId) allFileIds.push(p.coverImageFileId);
      if (p.mainImageFileIds) allFileIds.push(...p.mainImageFileIds);
      if (p.detailImageFileIds) allFileIds.push(...p.detailImageFileIds);
    }
    const urlMap = allFileIds.length > 0 ? await this.fileService.resolveUrls(allFileIds) : {};

    const productIds = rows.map((r) => r.productId);
    const skus = await this.skuRepo.find({ where: { productId: In(productIds) } });
    const skusByProduct = new Map<string, GroceryProductSku[]>();
    for (const s of skus) {
      const arr = skusByProduct.get(s.productId) ?? [];
      arr.push(s);
      skusByProduct.set(s.productId, arr);
    }

    return rows.map((p) => {
      const mainIds = p.mainImageFileIds ?? [];
      const detailIds = p.detailImageFileIds ?? [];
      const mainImageUrls = mainIds.map((id) => urlMap[id]).filter((u): u is string => Boolean(u));
      const detailImageUrls = detailIds.map((id) => urlMap[id]).filter((u): u is string => Boolean(u));
      const coverImageUrl = mainImageUrls[0] ?? (p.coverImageFileId ? (urlMap[p.coverImageFileId] ?? null) : null);

      const productSkus = (skusByProduct.get(p.productId) ?? []).slice().sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
        return a.skuId.localeCompare(b.skuId);
      });

      let priceFromCents: string | null = null;
      let priceToCents: string | null = null;
      if (p.pricedBy === 'sku' && productSkus.length > 0) {
        const prices = productSkus.map((s) => Number(s.priceCents));
        priceFromCents = String(Math.min(...prices));
        priceToCents = String(Math.max(...prices));
      }

      return plainToInstance(
        PublicGroceryProductVo,
        {
          productId: p.productId,
          categoryId: p.categoryId,
          name: p.name,
          coverImageFileId: p.coverImageFileId,
          mainImageFileIds: mainIds,
          detailImageFileIds: detailIds,
          mainImageUrls,
          detailImageUrls,
          coverImageUrl,
          description: p.description,
          tags: p.tags ?? [],
          isWeighted: p.isWeighted,
          pricedBy: p.pricedBy,
          unitPriceCentsPerJin: p.unitPriceCentsPerJin,
          estimatedWeightGrams: p.estimatedWeightGrams,
          stockJin: p.stockJin,
          deliveryMethods: p.deliveryMethods ?? [],
          priceDisplayRule: p.priceDisplayRule,
          priceFromCents,
          priceToCents,
          skus: productSkus.map((s) =>
            plainToInstance(
              PublicGrocerySkuVo,
              {
                skuId: s.skuId,
                specValue: s.specValue,
                priceCents: s.priceCents,
                stockJin: s.stockJin,
                weightGrams: s.weightGrams,
                displayOrder: s.displayOrder,
              },
              { excludeExtraneousValues: true },
            ),
          ),
          saleStatus: p.saleStatus,
          hasTraceability: p.hasTraceability,
        },
        { excludeExtraneousValues: true },
      );
    });
  }

  private assertImageLimits(main?: string[] | null, detail?: string[] | null): void {
    if (main && main.length > GROCERY_MAX_MAIN_IMAGES) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        message: `mainImageFileIds exceeds ${GROCERY_MAX_MAIN_IMAGES}`,
      });
    }
    if (detail && detail.length > GROCERY_MAX_DETAIL_IMAGES) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        message: `detailImageFileIds exceeds ${GROCERY_MAX_DETAIL_IMAGES}`,
      });
    }
  }

  private assertSkuPayload(pricedBy: GroceryPricedBy, skus: GroceryProductSkuItemDto[] | undefined): void {
    if (pricedBy === 'sku') {
      if (!skus || skus.length === 0) {
        throw new UnprocessableEntityException({
          code: ErrorCode.INVALID_PARAM,
          message: 'sku-priced product requires at least one sku',
        });
      }
      const seen = new Set<string>();
      for (const s of skus) {
        const key = s.specValue.trim();
        if (key.length === 0) {
          throw new UnprocessableEntityException({
            code: ErrorCode.INVALID_PARAM,
            message: 'sku specValue cannot be empty',
          });
        }
        if (seen.has(key)) {
          throw new UnprocessableEntityException({
            code: ErrorCode.INVALID_PARAM,
            message: `duplicate sku specValue: ${key}`,
          });
        }
        seen.add(key);
      }
    }
  }

  private aggregateSkuStockAndPrice(
    pricedBy: GroceryPricedBy,
    skus: GroceryProductSkuItemDto[] | undefined,
  ): { minPriceCents: number; totalStock: number } {
    if (pricedBy !== 'sku' || !skus || skus.length === 0) return { minPriceCents: 0, totalStock: 0 };
    const minPriceCents = Math.min(...skus.map((s) => Number(s.priceCents)));
    const totalStock = skus.reduce((acc, s) => acc + Number(s.stockJin), 0);
    return { minPriceCents, totalStock };
  }

  /** SKU diff: 已存在不传 → 删;传 skuId 已存在 → 更新;无 skuId → 插入 */
  private async persistSkus(
    repo: Repository<GroceryProductSku>,
    productId: string,
    incoming: GroceryProductSkuItemDto[],
    existing: GroceryProductSku[],
    now: string,
  ): Promise<void> {
    const incomingIds = new Set(incoming.filter((s) => s.skuId).map((s) => s.skuId as string));
    const toDelete = existing.filter((e) => !incomingIds.has(e.skuId));
    if (toDelete.length > 0) {
      await repo.delete({ skuId: In(toDelete.map((d) => d.skuId)) });
    }
    const existingById = new Map(existing.map((e) => [e.skuId, e]));
    for (let idx = 0; idx < incoming.length; idx += 1) {
      const s = incoming[idx]!;
      const specValue = s.specValue.trim();
      const priceCents = String(s.priceCents);
      const stockJin = Number(s.stockJin).toFixed(2);
      const weightGrams = s.weightGrams ?? null;
      const displayOrder = s.displayOrder ?? idx;
      if (s.skuId && existingById.has(s.skuId)) {
        await repo.update(
          { skuId: s.skuId },
          { specValue, priceCents, stockJin, weightGrams, displayOrder, updatedAt: now },
        );
      } else {
        const entity = repo.create({
          productId,
          specValue,
          priceCents,
          stockJin,
          weightGrams,
          displayOrder,
          createdAt: now,
          updatedAt: now,
        });
        await repo.save(entity);
      }
    }
  }
}
