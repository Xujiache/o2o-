import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

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
import { ProductService } from './product.service';

@ApiTags('merchant-product')
@Controller('m')
@UseGuards(MerchantJwtGuard, PermissionGuard)
@ApiBearerAuth('Merchant-Token')
export class ProductController {
  constructor(private readonly service: ProductService) {}

  // ============= 分类 =============

  @Get('product-categories')
  @RequirePermission('merchant:store:own')
  @ApiOperation({ summary: '商品分类列表(本店)' })
  async listCategories(@CurrentUser() p: CurrentPrincipal): Promise<CategoryVo[]> {
    return this.service.listCategories(p.principalId);
  }

  @Post('product-categories')
  @RequirePermission('merchant:store:own')
  @Idempotent({ scope: 'product-category:create', ttlSeconds: 60 })
  @Audit({ targetType: 'product-category' })
  @ApiOperation({ summary: '新建商品分类' })
  async createCategory(@CurrentUser() p: CurrentPrincipal, @Body() dto: CreateCategoryDto): Promise<CategoryVo> {
    return this.service.createCategory(p.principalId, dto);
  }

  @Patch('product-categories/:categoryId')
  @RequirePermission('merchant:store:own')
  @Idempotent({ scope: 'product-category:update', ttlSeconds: 60 })
  @Audit({ targetType: 'product-category' })
  @ApiOperation({ summary: '编辑商品分类(改名/排序)' })
  async updateCategory(
    @CurrentUser() p: CurrentPrincipal,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryVo> {
    return this.service.updateCategory(p.principalId, categoryId, dto);
  }

  @Delete('product-categories/:categoryId')
  @RequirePermission('merchant:store:own')
  @Idempotent({ scope: 'product-category:delete', ttlSeconds: 60 })
  @Audit({ targetType: 'product-category' })
  @ApiOperation({ summary: '删除分类(必须无商品)' })
  async deleteCategory(
    @CurrentUser() p: CurrentPrincipal,
    @Param('categoryId') categoryId: string,
  ): Promise<{ ok: boolean }> {
    await this.service.deleteCategory(p.principalId, categoryId);
    return { ok: true };
  }

  // ============= 商品 =============

  @Get('products')
  @RequirePermission('merchant:store:own')
  @ApiOperation({ summary: '商品列表(分页 + 筛选)' })
  @ApiOkResponse({ type: ProductPageVo })
  async listProducts(@CurrentUser() p: CurrentPrincipal, @Query() q: ListProductsQueryDto): Promise<ProductPageVo> {
    return this.service.listProducts(p.principalId, q);
  }

  @Post('products')
  @RequirePermission('merchant:store:own')
  @Idempotent({ scope: 'product:create', ttlSeconds: 60 })
  @Audit({ targetType: 'product' })
  @ApiOperation({ summary: '新增商品(支持 SKU)' })
  @ApiOkResponse({ type: CreateProductVo })
  async createProduct(@CurrentUser() p: CurrentPrincipal, @Body() dto: CreateProductDto): Promise<CreateProductVo> {
    return this.service.createProduct(p.principalId, dto);
  }

  @Get('products/:productId')
  @RequirePermission('merchant:store:own')
  @ApiOperation({ summary: '商品详情(含 SKU)' })
  async getProductDetail(@CurrentUser() p: CurrentPrincipal, @Param('productId') productId: string): Promise<unknown> {
    return this.service.getProductDetail(p.principalId, productId);
  }

  @Patch('products/batch-sale-status')
  @RequirePermission('merchant:store:own')
  @Idempotent({ scope: 'product:batch-sale-status', ttlSeconds: 60 })
  @Audit({ targetType: 'product-sale-status' })
  @ApiOperation({ summary: '批量上下架' })
  async batchSetSaleStatus(
    @CurrentUser() p: CurrentPrincipal,
    @Body() dto: BatchSaleStatusDto,
  ): Promise<{ updated: number }> {
    return this.service.batchSetSaleStatus(p.principalId, dto);
  }

  @Patch('products/:productId')
  @RequirePermission('merchant:store:own')
  @Idempotent({ scope: 'product:update', ttlSeconds: 60 })
  @Audit({ targetType: 'product' })
  @ApiOperation({ summary: '编辑商品(active promo 期间不可改 price)' })
  async updateProduct(
    @CurrentUser() p: CurrentPrincipal,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ): Promise<{ productId: string }> {
    return this.service.updateProduct(p.principalId, productId, dto);
  }

  @Patch('products/:productId/sale-status')
  @RequirePermission('merchant:store:own')
  @Idempotent({ scope: 'product:sale-status', ttlSeconds: 60 })
  @Audit({ targetType: 'product-sale-status' })
  @ApiOperation({ summary: '单个商品上下架' })
  @ApiOkResponse({ type: SaleStatusVo })
  async setSaleStatus(
    @CurrentUser() p: CurrentPrincipal,
    @Param('productId') productId: string,
    @Body() dto: SaleStatusDto,
  ): Promise<SaleStatusVo> {
    return this.service.setSaleStatus(p.principalId, productId, dto);
  }
}
