import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RiderJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { ViolationListQueryDto, ViolationListVo } from './violation.dto';
import { ViolationService } from './violation.service';

@ApiTags('rider-violation')
@Controller('r/violations')
@UseGuards(RiderJwtGuard, PermissionGuard)
@ApiBearerAuth('Rider-Token')
export class ViolationController {
  constructor(private readonly service: ViolationService) {}

  @Get()
  @RequirePermission('rider:self')
  @ApiOperation({ summary: '骑手违规记录(只读)' })
  @ApiOkResponse({ type: ViolationListVo })
  async list(@CurrentUser() p: CurrentPrincipal, @Query() q: ViolationListQueryDto): Promise<ViolationListVo> {
    return this.service.list(p.principalId, q);
  }
}
