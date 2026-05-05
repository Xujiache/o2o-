import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';

import { ErrandTypeListVo, GetErrandTypesQueryDto } from './errand-type.dto';
import { ErrandTypeService } from './errand-type.service';

@ApiTags('errand-type')
@Controller('c/errand')
export class ErrandTypeController {
  constructor(private readonly service: ErrandTypeService) {}

  @Get('service-types')
  @Public()
  @ApiOperation({ summary: '跑腿类型配置(@Public,Customer-Token 可选)' })
  @ApiOkResponse({ type: ErrandTypeListVo })
  async list(@Query() q: GetErrandTypesQueryDto): Promise<ErrandTypeListVo> {
    return this.service.list(q.cityCode);
  }
}
