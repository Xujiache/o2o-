import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  CreateWithdrawalDto,
  CreateWithdrawalVo,
  WithdrawalListQueryDto,
  WithdrawalListVo,
} from './merchant-withdrawal.dto';
import { MerchantWithdrawalService } from './merchant-withdrawal.service';

@ApiTags('merchant-withdrawal')
@Controller('m/withdrawals')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth('Merchant-Token')
export class MerchantWithdrawalController {
  constructor(private readonly service: MerchantWithdrawalService) {}

  @Get()
  @ApiOperation({ summary: '商家提现记录列表' })
  @ApiOkResponse({ type: WithdrawalListVo })
  async list(@CurrentUser() p: CurrentPrincipal, @Query() q: WithdrawalListQueryDto): Promise<WithdrawalListVo> {
    return this.service.list(p.principalId, q);
  }

  @Post()
  @Idempotent({ scope: 'withdrawal:create', ttlSeconds: 60 })
  @Audit({ targetType: 'withdrawal' })
  @ApiOperation({ summary: '商家发起提现(实名 + 额度 + smsCode)' })
  @ApiOkResponse({ type: CreateWithdrawalVo })
  async create(@CurrentUser() p: CurrentPrincipal, @Body() dto: CreateWithdrawalDto): Promise<CreateWithdrawalVo> {
    return this.service.create(p.principalId, dto);
  }
}
