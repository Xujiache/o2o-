import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RiderJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  CreateWithdrawalDto,
  CreateWithdrawalVo,
  WithdrawalListQueryDto,
  WithdrawalListVo,
} from './rider-withdrawal.dto';
import { RiderWithdrawalService } from './rider-withdrawal.service';

@ApiTags('rider-withdrawal')
@Controller('r/withdrawals')
@UseGuards(RiderJwtGuard, PermissionGuard)
@ApiBearerAuth('Rider-Token')
export class RiderWithdrawalController {
  constructor(private readonly service: RiderWithdrawalService) {}

  @Get()
  @RequirePermission('rider:self')
  @ApiOperation({ summary: '骑手提现记录' })
  @ApiOkResponse({ type: WithdrawalListVo })
  async list(@CurrentUser() p: CurrentPrincipal, @Query() q: WithdrawalListQueryDto): Promise<WithdrawalListVo> {
    return this.service.list(p.principalId, q);
  }

  @Post()
  @Idempotent({ scope: 'rider-withdrawal:create', ttlSeconds: 60 })
  @Audit({ targetType: 'rider-withdrawal' })
  @RequirePermission('rider:self')
  @ApiOperation({ summary: '骑手发起提现(实名 + 额度 + sms)' })
  @ApiOkResponse({ type: CreateWithdrawalVo })
  async create(@CurrentUser() p: CurrentPrincipal, @Body() dto: CreateWithdrawalDto): Promise<CreateWithdrawalVo> {
    return this.service.create(p.principalId, dto);
  }
}
