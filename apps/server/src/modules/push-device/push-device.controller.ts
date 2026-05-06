import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { AnyScopeJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { BindPushDeviceDto, BindPushDeviceVo } from './push-device.dto';
import { PushDeviceService } from './push-device.service';

@ApiTags('push-device')
@Controller('pub/push/devices')
@UseGuards(AnyScopeJwtGuard)
@ApiBearerAuth('Customer-Token')
@ApiBearerAuth('Merchant-Token')
@ApiBearerAuth('Rider-Token')
export class PushDeviceController {
  constructor(private readonly service: PushDeviceService) {}

  @Post()
  @Idempotent({ scope: 'push-device:bind', ttlSeconds: 60 })
  @Audit({ targetType: 'push-device' })
  @ApiOperation({ summary: '绑定推送设备(三端 APP 共用,按 token scope 校验 appType)' })
  @ApiOkResponse({ type: BindPushDeviceVo })
  async bind(@CurrentUser() p: CurrentPrincipal, @Body() dto: BindPushDeviceDto): Promise<BindPushDeviceVo> {
    return this.service.bind(p.scope, p.principalId, dto);
  }
}
