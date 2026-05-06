import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RiderJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { EarningQueryDto, EarningSummaryVo } from './rider-earning.dto';
import { RiderEarningService } from './rider-earning.service';

@ApiTags('rider-earning')
@Controller('r/earnings')
@UseGuards(RiderJwtGuard, PermissionGuard)
@ApiBearerAuth('Rider-Token')
export class RiderEarningController {
  constructor(private readonly service: RiderEarningService) {}

  @Get()
  @RequirePermission('rider:self')
  @ApiOperation({ summary: '骑手收益中心' })
  @ApiOkResponse({ type: EarningSummaryVo })
  async query(@CurrentUser() p: CurrentPrincipal, @Query() q: EarningQueryDto): Promise<EarningSummaryVo> {
    return this.service.query(p.principalId, q);
  }
}
