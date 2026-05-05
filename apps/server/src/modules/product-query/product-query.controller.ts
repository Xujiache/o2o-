import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';

import { FoodStoreProductsVo } from './product-query.dto';
import { ProductQueryService } from './product-query.service';

@ApiTags('product-query')
@Controller('c/food')
export class ProductQueryController {
  constructor(private readonly service: ProductQueryService) {}

  @Get('stores/:storeId/products')
  @Public()
  @ApiOperation({ summary: '店铺商品列表(@Public,Customer-Token 可选;返 categories/products/skus/promotions)' })
  @ApiOkResponse({ type: FoodStoreProductsVo })
  async getProducts(@Param('storeId') storeId: string): Promise<FoodStoreProductsVo> {
    return this.service.getProducts(storeId);
  }
}
