import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';

import { DictItemVo, QueryDictDto } from './dict.dto';
import { DictService } from './dict.service';

@ApiTags('public')
@Controller('pub/dictionaries')
export class DictController {
  constructor(private readonly service: DictService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取字典(状态枚举/城市/文件类型等)' })
  @ApiOkResponse({ type: [DictItemVo] })
  async query(@Query() dto: QueryDictDto): Promise<DictItemVo[]> {
    return this.service.query(dto.typeList);
  }
}
