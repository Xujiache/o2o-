import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';

import { FoodHomeVo, GetFoodHomeQueryDto } from './food-home.dto';
import { FoodHomeService } from './food-home.service';

@ApiTags('food-home')
@Controller('c/food')
export class FoodHomeController {
  constructor(private readonly service: FoodHomeService) {}

  @Get('home')
  @Public()
  @ApiOperation({ summary: '外卖首页(@Public,Customer-Token 可选)' })
  @ApiOkResponse({ type: FoodHomeVo })
  async home(@Query() query: GetFoodHomeQueryDto): Promise<FoodHomeVo> {
    return this.service.getHome(query.cityCode, query.lng, query.lat);
  }
}
