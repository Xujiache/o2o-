import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import {
  AdjustStockDto,
  AdminListGroceryProductsQueryDto,
  AdminListGroceryProductsVo,
  CategoryMutationVo,
  CreateGroceryCategoryDto,
  CreateGroceryProductDto,
  ListGroceryCategoriesVo,
  ProductMutationVo,
  ShelfActionDto,
  UpdateGroceryCategoryDto,
  UpdateGroceryProductDto,
} from './grocery-product.dto';
import { GroceryProductService } from './grocery-product.service';

@ApiTags('admin-grocery-product')
@Controller('admin/grocery')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminGroceryProductController {
  constructor(private readonly service: GroceryProductService) {}

  /** ===== 分类 ===== */
  @Get('categories')
  @RequirePermission('admin:grocery:product:read')
  @ApiOperation({ summary: '分类列表(含 inactive)' })
  @ApiOkResponse({ type: ListGroceryCategoriesVo })
  async listCategories(): Promise<ListGroceryCategoriesVo> {
    return this.service.listCategoriesAdmin();
  }

  @Post('categories')
  @RequirePermission('admin:grocery:product:write')
  @Idempotent({ scope: 'admin-grocery-category:create', ttlSeconds: 60 })
  @Audit({ targetType: 'grocery-category' })
  @ApiOperation({ summary: '新增分类' })
  @ApiOkResponse({ type: CategoryMutationVo })
  async createCategory(@Body() dto: CreateGroceryCategoryDto): Promise<CategoryMutationVo> {
    return this.service.createCategory(dto);
  }

  @Patch('categories/:categoryId')
  @RequirePermission('admin:grocery:product:write')
  @Idempotent({ scope: 'admin-grocery-category:update', ttlSeconds: 30 })
  @Audit({ targetType: 'grocery-category' })
  @ApiOperation({ summary: '更新分类' })
  @ApiOkResponse({ type: CategoryMutationVo })
  async updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateGroceryCategoryDto,
  ): Promise<CategoryMutationVo> {
    return this.service.updateCategory(categoryId, dto);
  }

  @Delete('categories/:categoryId')
  @RequirePermission('admin:grocery:product:write')
  @Idempotent({ scope: 'admin-grocery-category:delete', ttlSeconds: 30 })
  @Audit({ targetType: 'grocery-category' })
  @ApiOperation({ summary: '软停用分类(必须无商品)' })
  @ApiOkResponse({ type: CategoryMutationVo })
  async deleteCategory(@Param('categoryId') categoryId: string): Promise<CategoryMutationVo> {
    return this.service.deleteCategory(categoryId);
  }

  /** ===== 商品 ===== */
  @Get('products')
  @RequirePermission('admin:grocery:product:read')
  @ApiOperation({ summary: '商品列表(分页 + 分类 + 关键词 + 状态)' })
  @ApiOkResponse({ type: AdminListGroceryProductsVo })
  async listProducts(@Query() query: AdminListGroceryProductsQueryDto): Promise<AdminListGroceryProductsVo> {
    return this.service.listProductsAdmin(query);
  }

  @Post('products')
  @RequirePermission('admin:grocery:product:write')
  @Idempotent({ scope: 'admin-grocery-product:create', ttlSeconds: 60 })
  @Audit({ targetType: 'grocery-product' })
  @ApiOperation({ summary: '新增按斤计价商品' })
  @ApiOkResponse({ type: ProductMutationVo })
  async createProduct(@Body() dto: CreateGroceryProductDto): Promise<ProductMutationVo> {
    return this.service.createProduct(dto);
  }

  @Patch('products/:productId')
  @RequirePermission('admin:grocery:product:write')
  @Idempotent({ scope: 'admin-grocery-product:update', ttlSeconds: 30 })
  @Audit({ targetType: 'grocery-product' })
  @ApiOperation({ summary: '更新商品' })
  @ApiOkResponse({ type: ProductMutationVo })
  async updateProduct(
    @Param('productId') productId: string,
    @Body() dto: UpdateGroceryProductDto,
  ): Promise<ProductMutationVo> {
    return this.service.updateProduct(productId, dto);
  }

  @Post('products/:productId/shelf')
  @RequirePermission('admin:grocery:product:write')
  @Idempotent({ scope: 'admin-grocery-product:shelf', ttlSeconds: 30 })
  @Audit({ targetType: 'grocery-product' })
  @ApiOperation({ summary: '上下架商品' })
  @ApiOkResponse({ type: ProductMutationVo })
  async shelf(@Param('productId') productId: string, @Body() dto: ShelfActionDto): Promise<ProductMutationVo> {
    return this.service.setShelf(productId, dto);
  }

  @Patch('products/:productId/stock')
  @RequirePermission('admin:grocery:product:write')
  @Idempotent({ scope: 'admin-grocery-product:stock', ttlSeconds: 30 })
  @Audit({ targetType: 'grocery-product' })
  @ApiOperation({ summary: '调整库存(按斤,+入库 / -出库)' })
  @ApiOkResponse({ type: ProductMutationVo })
  async stock(@Param('productId') productId: string, @Body() dto: AdjustStockDto): Promise<ProductMutationVo> {
    return this.service.adjustStock(productId, dto);
  }
}
