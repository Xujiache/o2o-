import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';

import { FoodStoreListPageVo, ListStoresQueryDto } from './store-query.dto';
import { StoreQueryService } from './store-query.service';

@ApiTags('store-query')
@Controller('c/food')
export class StoreQueryController {
  constructor(private readonly service: StoreQueryService) {}

  @Get('stores')
  @Public()
  @ApiOperation({ summary: '外卖店铺列表(@Public,Customer-Token 可选;支持 keyword/categoryId/sort 筛选 + 分页)' })
  @ApiOkResponse({ type: FoodStoreListPageVo })
  async list(@Query() query: ListStoresQueryDto): Promise<FoodStoreListPageVo> {
    return this.service.list(query);
  }
}
