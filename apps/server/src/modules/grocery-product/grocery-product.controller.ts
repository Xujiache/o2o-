import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  GroceryProductDetailVo,
  type GroceryProductItemVo,
  GroceryProductPageVo,
  GroceryShelfDto,
  ListGroceryProductsQueryDto,
  UpsertGroceryProductDto,
} from './grocery-product.dto';
import { GroceryProductService } from './grocery-product.service';

@ApiTags('customer-grocery-product')
@Controller('c/grocery/products')
@Public()
export class GroceryProductCustomerController {
  constructor(private readonly service: GroceryProductService) {}

  @Get()
  @ApiOperation({ summary: '生鲜商品列表(可分类/搜索/排序)' })
  async list(@Query() query: ListGroceryProductsQueryDto): Promise<GroceryProductPageVo> {
    return this.service.listForCustomer(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '生鲜商品详情' })
  async detail(@Param('id') id: string): Promise<GroceryProductDetailVo> {
    return this.service.detailForCustomer(id);
  }
}

@ApiTags('merchant-grocery-product')
@Controller('m/grocery/products')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth('Merchant-Token')
export class GroceryProductMerchantController {
  constructor(private readonly service: GroceryProductService) {}

  @Get()
  @ApiOperation({ summary: '本商家生鲜商品列表' })
  async list(
    @CurrentUser() p: CurrentPrincipal,
    @Query() query: ListGroceryProductsQueryDto,
  ): Promise<GroceryProductPageVo> {
    return this.service.listForMerchant(p.principalId, query);
  }

  @Post()
  @Idempotent({ scope: 'grocery-product:create', ttlSeconds: 60 })
  @Audit({ targetType: 'grocery-product' })
  @ApiOperation({ summary: '新建生鲜商品(fixed/weighed)' })
  async create(
    @CurrentUser() p: CurrentPrincipal,
    @Body() dto: UpsertGroceryProductDto,
  ): Promise<GroceryProductItemVo> {
    return this.service.upsertForMerchant(p.principalId, null, dto);
  }

  @Put(':id')
  @Audit({ targetType: 'grocery-product' })
  @ApiOperation({ summary: '编辑生鲜商品' })
  async update(
    @CurrentUser() p: CurrentPrincipal,
    @Param('id') id: string,
    @Body() dto: UpsertGroceryProductDto,
  ): Promise<GroceryProductItemVo> {
    return this.service.upsertForMerchant(p.principalId, id, dto);
  }

  @Patch(':id/shelf')
  @Audit({ targetType: 'grocery-product' })
  @ApiOperation({ summary: '上下架' })
  async setShelf(
    @CurrentUser() p: CurrentPrincipal,
    @Param('id') id: string,
    @Body() dto: GroceryShelfDto,
  ): Promise<{ productId: string; saleStatus: string }> {
    return this.service.setShelf(p.principalId, id, dto);
  }
}
