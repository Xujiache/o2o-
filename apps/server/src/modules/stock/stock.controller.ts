import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { SetThresholdDto, StockAlertItemVo } from './stock.dto';
import { StockService } from './stock.service';

@ApiTags('merchant-stock')
@Controller('m/stock')
@UseGuards(MerchantJwtGuard, PermissionGuard)
@ApiBearerAuth('Merchant-Token')
export class StockController {
  constructor(private readonly service: StockService) {}

  @Get('alerts')
  @RequirePermission('merchant:store:own')
  @ApiOperation({ summary: '库存预警列表(stock < threshold)' })
  @ApiOkResponse({ type: [StockAlertItemVo] })
  async listAlerts(@CurrentUser() p: CurrentPrincipal): Promise<StockAlertItemVo[]> {
    return this.service.listAlerts(p.principalId);
  }

  @Patch('products/:productId/threshold')
  @RequirePermission('merchant:store:own')
  @Idempotent({ scope: 'stock:threshold', ttlSeconds: 60 })
  @Audit({ targetType: 'stock-threshold' })
  @ApiOperation({ summary: '设置商品库存预警阈值' })
  async setThreshold(
    @CurrentUser() p: CurrentPrincipal,
    @Param('productId') productId: string,
    @Body() dto: SetThresholdDto,
  ): Promise<{ productId: string; threshold: number }> {
    return this.service.setThreshold(p.principalId, productId, dto.threshold);
  }
}
