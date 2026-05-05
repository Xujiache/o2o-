import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { PreviewOrderDto, PreviewVo, SubmitOrderDto, SubmitOrderVo } from './food-order.dto';
import { FoodOrderService } from './food-order.service';

@ApiTags('food-order')
@Controller('c/food/orders')
@UseGuards(CustomerJwtGuard)
@ApiBearerAuth('Customer-Token')
export class FoodOrderController {
  constructor(private readonly service: FoodOrderService) {}

  @Post('preview')
  @Idempotent({ scope: 'food-order:preview', ttlSeconds: 60 })
  @ApiOperation({ summary: '订单试算(写 order_price_snapshot 5min TTL)' })
  @ApiOkResponse({ type: PreviewVo })
  async preview(@CurrentUser() principal: CurrentPrincipal, @Body() dto: PreviewOrderDto): Promise<PreviewVo> {
    return this.service.preview(principal.principalId, dto);
  }

  @Post()
  @Idempotent({ scope: 'food-order:submit', ttlSeconds: 60 })
  @Audit({ targetType: 'food-order' })
  @ApiOperation({ summary: '提交订单(事务:锁库存 + 写 food_order WAIT_PAY + 发 FoodOrderCreated)' })
  @ApiOkResponse({ type: SubmitOrderVo })
  async submit(@CurrentUser() principal: CurrentPrincipal, @Body() dto: SubmitOrderDto): Promise<SubmitOrderVo> {
    return this.service.submit(principal.principalId, dto);
  }
}
