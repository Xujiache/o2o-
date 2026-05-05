import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { ApplyAfterSaleDto, ApplyAfterSaleVo } from './customer-after-sale.dto';
import { CustomerAfterSaleService } from './customer-after-sale.service';

@ApiTags('customer-after-sale')
@Controller('c/after-sales')
@UseGuards(CustomerJwtGuard)
@ApiBearerAuth('Customer-Token')
export class CustomerAfterSaleController {
  constructor(private readonly service: CustomerAfterSaleService) {}

  @Post()
  @Idempotent({ scope: 'after-sale:apply', ttlSeconds: 60 })
  @Audit({ targetType: 'after-sale' })
  @ApiOperation({ summary: '用户申请售后' })
  @ApiOkResponse({ type: ApplyAfterSaleVo })
  async apply(@CurrentUser() p: CurrentPrincipal, @Body() dto: ApplyAfterSaleDto): Promise<ApplyAfterSaleVo> {
    return this.service.apply(p.principalId, dto);
  }
}
