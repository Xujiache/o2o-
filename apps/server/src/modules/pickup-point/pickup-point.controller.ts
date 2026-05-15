import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PublicListPickupPointsQueryDto, PublicListPickupPointsVo, PublicPickupPointVo } from './pickup-point.dto';
import { PickupPointService } from './pickup-point.service';

@ApiTags('pickup-point')
@Controller('pub/pickup-points')
export class PickupPointController {
  constructor(private readonly service: PickupPointService) {}

  @Get()
  @ApiOperation({ summary: '公开:自提点列表(传 lng/lat 后按距离升序)' })
  @ApiOkResponse({ type: PublicListPickupPointsVo })
  async list(@Query() query: PublicListPickupPointsQueryDto): Promise<PublicListPickupPointsVo> {
    return this.service.publicList(query);
  }

  @Get(':pickupPointId')
  @ApiOperation({ summary: '公开:自提点详情' })
  @ApiOkResponse({ type: PublicPickupPointVo })
  async detail(@Param('pickupPointId') pickupPointId: string): Promise<PublicPickupPointVo> {
    return this.service.publicDetail(pickupPointId);
  }
}
