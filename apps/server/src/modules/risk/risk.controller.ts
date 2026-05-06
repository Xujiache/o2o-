import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import { RiskExceptionsListVo, RiskExceptionsQueryDto } from './risk.dto';
import { RiskService } from './risk.service';

@ApiTags('risk')
@Controller('admin/risk')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class RiskController {
  constructor(private readonly service: RiskService) {}

  @Get('exceptions')
  @RequirePermission('admin:risk:view')
  @ApiOperation({ summary: '异常订单列表' })
  @ApiOkResponse({ type: RiskExceptionsListVo })
  async listExceptions(@Query() q: RiskExceptionsQueryDto): Promise<RiskExceptionsListVo> {
    return this.service.listExceptions(q);
  }
}
