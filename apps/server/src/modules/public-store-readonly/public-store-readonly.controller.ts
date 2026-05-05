import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';

import {
  ListPublicProductsQueryDto,
  ListPublicStoresQueryDto,
  PublicProductPageVo,
  PublicStoreDetailVo,
  PublicStorePageVo,
} from './public-store-readonly.dto';
import { PublicStoreReadonlyService } from './public-store-readonly.service';

@ApiTags('public-store')
@Controller('pub/stores')
export class PublicStoreReadonlyController {
  constructor(private readonly service: PublicStoreReadonlyService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '公开店铺列表(只返回 business_status=online + 商家 active)' })
  @ApiOkResponse({ type: PublicStorePageVo })
  async listStores(@Query() query: ListPublicStoresQueryDto): Promise<PublicStorePageVo> {
    return this.service.listStores(query);
  }

  @Get(':storeId')
  @Public()
  @ApiOperation({ summary: '公开店铺详情' })
  @ApiOkResponse({ type: PublicStoreDetailVo })
  async getStoreDetail(@Param('storeId') storeId: string): Promise<PublicStoreDetailVo> {
    return this.service.getStoreDetail(storeId);
  }

  @Get(':storeId/products')
  @Public()
  @ApiOperation({ summary: '公开店铺商品列表(只返回 sale_status=on_shelf)' })
  @ApiOkResponse({ type: PublicProductPageVo })
  async listProducts(
    @Param('storeId') storeId: string,
    @Query() query: ListPublicProductsQueryDto,
  ): Promise<PublicProductPageVo> {
    return this.service.listProducts(storeId, query);
  }
}
