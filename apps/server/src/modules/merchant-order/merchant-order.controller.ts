import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  AcceptOrderDto,
  AcceptOrderVo,
  MerchantOrderListVo,
  PendingListQueryDto,
  ReadyOrderDto,
  ReadyOrderVo,
  RejectOrderDto,
  RejectOrderVo,
} from './merchant-order.dto';
import { MerchantOrderService } from './merchant-order.service';

@ApiTags('merchant-order')
@Controller('m/food-orders')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth('Merchant-Token')
export class MerchantOrderController {
  constructor(private readonly service: MerchantOrderService) {}

  @Get('pending')
  @ApiOperation({ summary: '商家待接单列表' })
  @ApiOkResponse({ type: MerchantOrderListVo })
  async pending(@CurrentUser() p: CurrentPrincipal, @Query() q: PendingListQueryDto): Promise<MerchantOrderListVo> {
    return this.service.listPending(p.principalId, q);
  }

  @Post(':orderId/accept')
  @Idempotent({ scope: 'merchant-order:accept', ttlSeconds: 60 })
  @Audit({ targetType: 'food-order' })
  @ApiOperation({ summary: '商家接单(PAID_WAIT_MERCHANT → PREPARING)' })
  @ApiOkResponse({ type: AcceptOrderVo })
  async accept(
    @CurrentUser() p: CurrentPrincipal,
    @Param('orderId') orderId: string,
    @Body() dto: AcceptOrderDto,
  ): Promise<AcceptOrderVo> {
    return this.service.accept(p.principalId, orderId, dto);
  }

  @Post(':orderId/reject')
  @Idempotent({ scope: 'merchant-order:reject', ttlSeconds: 60 })
  @Audit({ targetType: 'food-order' })
  @ApiOperation({ summary: '商家拒单(PAID_WAIT_MERCHANT → CANCELLED + REFUNDING)' })
  @ApiOkResponse({ type: RejectOrderVo })
  async reject(
    @CurrentUser() p: CurrentPrincipal,
    @Param('orderId') orderId: string,
    @Body() dto: RejectOrderDto,
  ): Promise<RejectOrderVo> {
    return this.service.reject(p.principalId, orderId, dto);
  }

  @Post(':orderId/ready')
  @Idempotent({ scope: 'merchant-order:ready', ttlSeconds: 60 })
  @Audit({ targetType: 'food-order' })
  @ApiOperation({ summary: '出餐完成(PREPARING → READY_FOR_PICKUP)' })
  @ApiOkResponse({ type: ReadyOrderVo })
  async ready(
    @CurrentUser() p: CurrentPrincipal,
    @Param('orderId') orderId: string,
    @Body() dto: ReadyOrderDto,
  ): Promise<ReadyOrderVo> {
    return this.service.ready(p.principalId, orderId, dto);
  }
}
