import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { ArbitrateDto, ArbitrateVo } from './arbitrate.dto';
import { ArbitrateService } from './arbitrate.service';

@ApiTags('admin-after-sale')
@Controller('admin/after-sales')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class ArbitrateController {
  constructor(private readonly service: ArbitrateService) {}

  @Post(':afterSaleId/arbitrate')
  @RequirePermission('admin:after:sales:manage')
  @Idempotent({ scope: 'admin-after-sale:arbitrate', ttlSeconds: 60 })
  @Audit({ targetType: 'after-sale' })
  @ApiOperation({ summary: '售后仲裁' })
  @ApiOkResponse({ type: ArbitrateVo })
  async arbitrate(
    @Param('afterSaleId') afterSaleId: string,
    @Body() dto: ArbitrateDto,
    @CurrentUser() principal: CurrentPrincipal,
  ): Promise<ArbitrateVo> {
    return this.service.arbitrate(afterSaleId, dto, principal.principalId);
  }
}
