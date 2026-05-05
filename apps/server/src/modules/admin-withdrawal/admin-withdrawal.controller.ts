import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import { AdminWithdrawalListItemVo, AdminWithdrawalListVo, AdminWithdrawalQueryDto } from './admin-withdrawal.dto';
import { AdminWithdrawalService } from './admin-withdrawal.service';

@ApiTags('admin-withdrawal')
@Controller('admin/withdrawals')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminWithdrawalController {
  constructor(private readonly service: AdminWithdrawalService) {}

  @Get()
  @RequirePermission('admin:withdrawals:view')
  @ApiOperation({ summary: '平台提现单列表' })
  @ApiOkResponse({ type: AdminWithdrawalListVo })
  async list(@Query() q: AdminWithdrawalQueryDto): Promise<AdminWithdrawalListVo> {
    return this.service.list(q);
  }

  @Get(':id')
  @RequirePermission('admin:withdrawals:view')
  @ApiOperation({ summary: '平台提现单详情' })
  @ApiOkResponse({ type: AdminWithdrawalListItemVo })
  async detail(@Param('id') id: string): Promise<AdminWithdrawalListItemVo> {
    return this.service.detail(id);
  }
}
