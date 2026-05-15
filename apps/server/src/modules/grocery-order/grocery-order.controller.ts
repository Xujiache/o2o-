import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  CancelGroceryOrderDto,
  GroceryOrderMutationVo,
  GroceryOrderVo,
  ListGroceryOrdersQueryDto,
  ListGroceryOrdersVo,
  SubmitGroceryOrderDto,
} from './grocery-order.dto';
import { GroceryOrderService } from './grocery-order.service';

@ApiTags('grocery-order')
@Controller('c/grocery/orders')
@UseGuards(CustomerJwtGuard)
@ApiBearerAuth('Customer-Token')
export class GroceryOrderController {
  constructor(private readonly service: GroceryOrderService) {}

  @Post()
  @Idempotent({ scope: 'c-grocery-order:submit', ttlSeconds: 60 })
  @Audit({ targetType: 'grocery-order' })
  @ApiOperation({ summary: 'submit grocery order (estimate price locked, wait_pay)' })
  @ApiOkResponse({ type: GroceryOrderMutationVo })
  async submit(
    @CurrentUser() principal: CurrentPrincipal,
    @Body() dto: SubmitGroceryOrderDto,
  ): Promise<GroceryOrderMutationVo> {
    return this.service.submit(principal.principalId, dto);
  }

  @Post(':orderId/cancel')
  @Idempotent({ scope: 'c-grocery-order:cancel', ttlSeconds: 30 })
  @Audit({ targetType: 'grocery-order' })
  @ApiOperation({ summary: 'cancel order (wait_pay or paid only)' })
  @ApiOkResponse({ type: GroceryOrderMutationVo })
  async cancel(
    @CurrentUser() principal: CurrentPrincipal,
    @Param('orderId') orderId: string,
    @Body() dto: CancelGroceryOrderDto,
  ): Promise<GroceryOrderMutationVo> {
    return this.service.cancel(principal.principalId, orderId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'my grocery orders' })
  @ApiOkResponse({ type: ListGroceryOrdersVo })
  async list(
    @CurrentUser() principal: CurrentPrincipal,
    @Query() query: ListGroceryOrdersQueryDto,
  ): Promise<ListGroceryOrdersVo> {
    return this.service.list(principal.principalId, query);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'order detail' })
  @ApiOkResponse({ type: GroceryOrderVo })
  async detail(@CurrentUser() principal: CurrentPrincipal, @Param('orderId') orderId: string): Promise<GroceryOrderVo> {
    return this.service.detail(principal.principalId, orderId);
  }
}
