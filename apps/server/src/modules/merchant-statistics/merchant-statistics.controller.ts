import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { StatisticsQueryDto, StatisticsVo } from './merchant-statistics.dto';
import { MerchantStatisticsService } from './merchant-statistics.service';

@ApiTags('merchant-statistics')
@Controller('m/statistics')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth('Merchant-Token')
export class MerchantStatisticsController {
  constructor(private readonly service: MerchantStatisticsService) {}

  @Get()
  @ApiOperation({ summary: '商家经营统计(日/月聚合)' })
  @ApiOkResponse({ type: StatisticsVo })
  async query(@CurrentUser() p: CurrentPrincipal, @Query() q: StatisticsQueryDto): Promise<StatisticsVo> {
    return this.service.query(p.principalId, q);
  }
}
