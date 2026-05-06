import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import { AdminPaymentVo } from './admin-payment.dto';
import { AdminPaymentService } from './admin-payment.service';

@ApiTags('admin-payment')
@Controller('admin/payments')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminPaymentController {
  constructor(private readonly service: AdminPaymentService) {}

  @Get(':payOrderId')
  @RequirePermission('admin:payment:view')
  @Audit({ targetType: 'payment-order-read' })
  @ApiOperation({ summary: '平台支付单详情(含 callbackLogs)' })
  @ApiOkResponse({ type: AdminPaymentVo })
  async getOne(@Param('payOrderId') payOrderId: string): Promise<AdminPaymentVo> {
    return this.service.getOne(payOrderId);
  }
}
