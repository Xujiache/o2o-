import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  CancelErrandDto,
  CancelErrandVo,
  ErrandOrderDetailVo,
  ErrandOrderListVo,
  ErrandTrackVo,
  ListErrandQueryDto,
  QuoteErrandDto,
  QuoteVo,
  RemarkErrandDto,
  RemarkErrandVo,
  SubmitErrandDto,
  SubmitErrandVo,
  UrgentErrandDto,
  UrgentErrandVo,
} from './errand-order.dto';
import { ErrandOrderService } from './errand-order.service';

@ApiTags('errand-order')
@Controller('c/errand')
@UseGuards(CustomerJwtGuard)
@ApiBearerAuth('Customer-Token')
export class ErrandOrderController {
  constructor(private readonly service: ErrandOrderService) {}

  @Post('quotes')
  @Idempotent({ scope: 'errand:quote', ttlSeconds: 60 })
  @Audit({ targetType: 'errand-quote' })
  @ApiOperation({ summary: '跑腿报价(同步,不下单)' })
  @ApiOkResponse({ type: QuoteVo })
  async quote(@CurrentUser() p: CurrentPrincipal, @Body() dto: QuoteErrandDto): Promise<QuoteVo> {
    return this.service.quote(p.principalId, dto);
  }

  @Post('orders')
  @Idempotent({ scope: 'errand:submit', ttlSeconds: 60 })
  @Audit({ targetType: 'errand-order' })
  @ApiOperation({ summary: '提交跑腿订单 + 创建支付单' })
  @ApiOkResponse({ type: SubmitErrandVo })
  async submit(@CurrentUser() p: CurrentPrincipal, @Body() dto: SubmitErrandDto): Promise<SubmitErrandVo> {
    return this.service.submit(p.principalId, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: '跑腿订单列表(A1 补)' })
  @ApiOkResponse({ type: ErrandOrderListVo })
  async list(@CurrentUser() p: CurrentPrincipal, @Query() q: ListErrandQueryDto): Promise<ErrandOrderListVo> {
    return this.service.list(p.principalId, q);
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: '跑腿订单详情' })
  @ApiOkResponse({ type: ErrandOrderDetailVo })
  async detail(@CurrentUser() p: CurrentPrincipal, @Param('orderId') orderId: string): Promise<ErrandOrderDetailVo> {
    return this.service.detail(p.principalId, orderId);
  }

  @Post('orders/:orderId/cancel')
  @Idempotent({ scope: 'errand:cancel', ttlSeconds: 60 })
  @Audit({ targetType: 'errand-order' })
  @ApiOperation({ summary: '用户主动取消(WAIT_PAY only,A2 补)' })
  @ApiOkResponse({ type: CancelErrandVo })
  async cancel(
    @CurrentUser() p: CurrentPrincipal,
    @Param('orderId') orderId: string,
    @Body() dto: CancelErrandDto,
  ): Promise<CancelErrandVo> {
    return this.service.cancel(p.principalId, orderId, dto);
  }

  @Post('orders/:orderId/urgent')
  @Idempotent({ scope: 'errand:urgent', ttlSeconds: 60 })
  @Audit({ targetType: 'errand-order' })
  @ApiOperation({ summary: '加急(仅 PAID/DISPATCHING/ASSIGNED 可上调档)' })
  @ApiOkResponse({ type: UrgentErrandVo })
  async urgent(
    @CurrentUser() p: CurrentPrincipal,
    @Param('orderId') orderId: string,
    @Body() dto: UrgentErrandDto,
  ): Promise<UrgentErrandVo> {
    return this.service.urgent(p.principalId, orderId, dto);
  }

  @Patch('orders/:orderId/remark')
  @Idempotent({ scope: 'errand:remark', ttlSeconds: 60 })
  @Audit({ targetType: 'errand-order' })
  @ApiOperation({ summary: '补充备注 / 附件' })
  @ApiOkResponse({ type: RemarkErrandVo })
  async remark(
    @CurrentUser() p: CurrentPrincipal,
    @Param('orderId') orderId: string,
    @Body() dto: RemarkErrandDto,
  ): Promise<RemarkErrandVo> {
    return this.service.remark(p.principalId, orderId, dto);
  }

  @Get('orders/:orderId/track')
  @ApiOperation({ summary: '跑腿订单轨迹(简化:起点+终点+eta)' })
  @ApiOkResponse({ type: ErrandTrackVo })
  async track(@CurrentUser() p: CurrentPrincipal, @Param('orderId') orderId: string): Promise<ErrandTrackVo> {
    return this.service.track(p.principalId, orderId);
  }
}
