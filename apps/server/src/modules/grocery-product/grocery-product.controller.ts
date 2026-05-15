import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  ListGroceryCategoriesVo,
  PublicGroceryProductVo,
  PublicListGroceryProductsQueryDto,
  PublicListGroceryProductsVo,
} from './grocery-product.dto';
import { GroceryProductService } from './grocery-product.service';

@ApiTags('grocery-product')
@Controller('pub/grocery')
export class GroceryProductController {
  constructor(private readonly service: GroceryProductService) {}

  @Get('categories')
  @ApiOperation({ summary: 'public: grocery categories list (active only)' })
  @ApiOkResponse({ type: ListGroceryCategoriesVo })
  async listCategories(): Promise<ListGroceryCategoriesVo> {
    return this.service.listCategoriesPublic();
  }

  @Get('products')
  @ApiOperation({ summary: 'public: grocery products list (paging + category + keyword)' })
  @ApiOkResponse({ type: PublicListGroceryProductsVo })
  async listProducts(@Query() query: PublicListGroceryProductsQueryDto): Promise<PublicListGroceryProductsVo> {
    return this.service.listProductsPublic(query);
  }

  @Get('products/:productId')
  @ApiOperation({ summary: 'public: grocery product detail' })
  @ApiOkResponse({ type: PublicGroceryProductVo })
  async detail(@Param('productId') productId: string): Promise<PublicGroceryProductVo> {
    return this.service.detailPublic(productId);
  }
}
