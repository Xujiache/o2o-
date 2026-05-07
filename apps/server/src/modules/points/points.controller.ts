import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  PointsOverviewVo,
  PointsRecordsQueryDto,
  PointsRecordsVo,
  PointsRulesQueryDto,
  PointsRulesVo,
} from './points.dto';
import { PointsService } from './points.service';

@ApiTags('points')
@Controller('c/points')
@UseGuards(CustomerJwtGuard)
@ApiBearerAuth('Customer-Token')
export class PointsController {
  constructor(private readonly service: PointsService) {}

  @Get('overview')
  @ApiOperation({ summary: '用户积分概览' })
  @ApiOkResponse({ type: PointsOverviewVo })
  async overview(@CurrentUser() principal: CurrentPrincipal): Promise<PointsOverviewVo> {
    return this.service.overview(principal.principalId);
  }

  @Get('rules')
  @ApiOperation({ summary: '积分规则列表' })
  @ApiOkResponse({ type: PointsRulesVo })
  async rules(@Query() query: PointsRulesQueryDto): Promise<PointsRulesVo> {
    return this.service.rules(query);
  }

  @Get('records')
  @ApiOperation({ summary: '用户积分记录' })
  @ApiOkResponse({ type: PointsRecordsVo })
  async records(
    @CurrentUser() principal: CurrentPrincipal,
    @Query() query: PointsRecordsQueryDto,
  ): Promise<PointsRecordsVo> {
    return this.service.records(principal.principalId, query);
  }
}
