import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';

import {
  CancelForOOSDto,
  ListPickingQueryDto,
  PickingDetailVo,
  PickingItemVo,
  PickingMutationVo,
  PickingOrderListVo,
  VerifyPickupDto,
  WeighItemDto,
  WeighItemResultVo,
} from './picking.dto';
import { PickingService } from './picking.service';

@ApiTags('m-grocery-order')
@Controller('m/grocery/orders')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth('Merchant-Token')
export class MGroceryOrderController {
  constructor(private readonly service: PickingService) {}

  @Get()
  @ApiOperation({ summary: '拣货池列表(运营员/商家)' })
  @ApiOkResponse({ type: PickingOrderListVo })
  async list(@Query() query: ListPickingQueryDto): Promise<PickingOrderListVo> {
    return this.service.listForPicking(query.status, query.pageNo ?? 1, query.pageSize ?? 20);
  }

  @Get(':orderId')
  @ApiOperation({ summary: '拣货订单详情(含全部 item + 已称重状态)' })
  @ApiOkResponse({ type: PickingDetailVo })
  async detail(@Param('orderId') orderId: string): Promise<PickingDetailVo> {
    const { order, items } = await this.service.pickingDetail(orderId);
    return {
      orderId: order.orderId,
      status: order.status,
      estimatedAmountCents: order.estimatedAmountCents,
      finalAmountCents: order.finalAmountCents,
      weightDeltaCents: order.weightDeltaCents,
      pickupCode: order.pickupCode,
      pickupPointId: order.pickupPointId,
      pickupPointSnapshot: order.pickupPointSnapshot,
      createdAt: order.createdAt,
      items: items.map(
        (it): PickingItemVo => ({
          itemId: it.itemId,
          productId: it.productId,
          productNameSnapshot: it.productNameSnapshot,
          unitPriceCentsPerJin: it.unitPriceCentsPerJin,
          estimatedPerPortionGrams: it.estimatedPerPortionGrams,
          portions: it.portions,
          estimatedWeightGrams: it.estimatedWeightGrams,
          estimatedLineCents: it.estimatedLineCents,
          finalWeightGrams: it.finalWeightGrams,
          finalLineCents: it.finalLineCents,
          boundQrcodeIds: it.boundQrcodeIds,
          hasTraceability: it.hasTraceability,
        }),
      ),
    };
  }

  @Post(':orderId/start-picking')
  @Idempotent({ scope: 'm-grocery:start-picking', ttlSeconds: 30 })
  @Audit({ targetType: 'grocery-order' })
  @ApiOperation({ summary: '开始拣货(paid → picking)' })
  @ApiOkResponse({ type: PickingMutationVo })
  async startPicking(@Param('orderId') orderId: string): Promise<PickingMutationVo> {
    return this.service.startPicking(orderId);
  }

  @Post(':orderId/items/:itemId/weigh')
  @Idempotent({ scope: 'm-grocery:weigh', ttlSeconds: 10 })
  @Audit({ targetType: 'grocery-order-item' })
  @ApiOperation({ summary: '录入某行实际称重(可重复修正)' })
  @ApiOkResponse({ type: WeighItemResultVo })
  async weigh(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: WeighItemDto,
  ): Promise<WeighItemResultVo> {
    return this.service.weighItem(orderId, itemId, dto.finalWeightGrams, dto.boundQrcodeIds);
  }

  @Post(':orderId/settle')
  @Idempotent({ scope: 'm-grocery:settle', ttlSeconds: 30 })
  @Audit({ targetType: 'grocery-order' })
  @ApiOperation({ summary: '结算差额(picking → weigh_settled,自动校验 30% 上限)' })
  @ApiOkResponse({ type: PickingMutationVo })
  async settle(@Param('orderId') orderId: string): Promise<PickingMutationVo> {
    const r = await this.service.settle(orderId);
    return {
      orderId: r.orderId,
      status: r.status,
      updatedAt: String(Date.now()),
      finalAmountCents: r.finalAmountCents,
      weightDeltaCents: r.weightDeltaCents,
    };
  }

  @Post(':orderId/mark-ready')
  @Idempotent({ scope: 'm-grocery:mark-ready', ttlSeconds: 30 })
  @Audit({ targetType: 'grocery-order' })
  @ApiOperation({ summary: '标记可自提(weigh_settled → pickup_ready,生成 6 位自提码)' })
  @ApiOkResponse({ type: PickingMutationVo })
  async markReady(@Param('orderId') orderId: string): Promise<PickingMutationVo> {
    const r = await this.service.markReady(orderId);
    return { orderId: r.orderId, status: r.status, updatedAt: String(Date.now()), pickupCode: r.pickupCode };
  }

  @Post(':orderId/verify-pickup')
  @Idempotent({ scope: 'm-grocery:verify-pickup', ttlSeconds: 30 })
  @Audit({ targetType: 'grocery-order' })
  @ApiOperation({ summary: '核销自提码(pickup_ready → picked_up)' })
  @ApiOkResponse({ type: PickingMutationVo })
  async verify(@Param('orderId') orderId: string, @Body() dto: VerifyPickupDto): Promise<PickingMutationVo> {
    const r = await this.service.verifyPickup(orderId, dto.code);
    return { orderId: r.orderId, status: r.status, updatedAt: String(Date.now()) };
  }

  @Post(':orderId/cancel-oos')
  @Idempotent({ scope: 'm-grocery:cancel-oos', ttlSeconds: 30 })
  @Audit({ targetType: 'grocery-order' })
  @ApiOperation({ summary: '缺货全退(picking → refunded,回滚库存)' })
  @ApiOkResponse({ type: PickingMutationVo })
  async cancelOOS(@Param('orderId') orderId: string, @Body() dto: CancelForOOSDto): Promise<PickingMutationVo> {
    const r = await this.service.cancelForOOS(orderId, dto.reason);
    return { orderId: r.orderId, status: r.status, updatedAt: String(Date.now()) };
  }
}
