import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { RealnameVerifyDto, RealnameVerifyVo } from './realname.dto';
import { RealnameService } from './realname.service';

@ApiTags('customer-realname')
@Controller('c/realname')
@UseGuards(CustomerJwtGuard, PermissionGuard)
@ApiBearerAuth('Customer-Token')
export class RealnameController {
  constructor(private readonly service: RealnameService) {}

  @Post('verify')
  @RequirePermission('customer:self')
  @Idempotent({ scope: 'realname:verify', ttlSeconds: 60 })
  @Audit({ targetType: 'customer-realname' })
  @ApiOperation({ summary: '提交实名认证(姓名+身份证+短信验证码)' })
  @ApiOkResponse({ type: RealnameVerifyVo })
  async verify(@CurrentUser() principal: CurrentPrincipal, @Body() dto: RealnameVerifyDto): Promise<RealnameVerifyVo> {
    return this.service.submit(principal.principalId, dto);
  }
}
