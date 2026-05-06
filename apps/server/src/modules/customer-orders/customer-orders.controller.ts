import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { CustomerOrderTimelineVo, type OrderBizType } from './customer-orders.dto';
import { CustomerOrdersService } from './customer-orders.service';

@ApiTags('customer-orders')
@Controller('c/orders')
@UseGuards(CustomerJwtGuard)
@ApiBearerAuth('Customer-Token')
export class CustomerOrdersController {
  constructor(private readonly service: CustomerOrdersService) {}

  @Get(':bizType/:orderId/timeline')
  @ApiOperation({ summary: '用户端订单时间线(外卖/跑腿统一入口)' })
  @ApiOkResponse({ type: CustomerOrderTimelineVo })
  async timeline(
    @CurrentUser() p: CurrentPrincipal,
    @Param('bizType') bizType: OrderBizType,
    @Param('orderId') orderId: string,
  ): Promise<CustomerOrderTimelineVo> {
    return this.service.getTimeline(p.principalId, bizType, orderId);
  }
}
