import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { TrackQueryVo } from './track-query.dto';
import { TrackQueryService } from './track-query.service';

@ApiTags('track-query')
@Controller('c/food/orders')
@UseGuards(CustomerJwtGuard)
@ApiBearerAuth('Customer-Token')
export class TrackQueryController {
  constructor(private readonly service: TrackQueryService) {}

  @Get(':orderId/track')
  @ApiOperation({ summary: '订单轨迹查询(stage 5 简化:返起点+终点+eta;真实路径 stage 8)' })
  @ApiOkResponse({ type: TrackQueryVo })
  async getTrack(@CurrentUser() principal: CurrentPrincipal, @Param('orderId') orderId: string): Promise<TrackQueryVo> {
    return this.service.getTrack(principal.principalId, orderId);
  }
}
