import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { ManualAssignDto, ManualAssignVo } from './manual-dispatch.dto';
import { ManualDispatchService } from './manual-dispatch.service';

@ApiTags('admin-dispatch')
@Controller('admin/dispatch/tasks')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class ManualDispatchController {
  constructor(private readonly service: ManualDispatchService) {}

  @Post(':taskId/assign')
  @RequirePermission('admin:dispatch:manage')
  @Idempotent({ scope: 'admin-dispatch:manual-assign', ttlSeconds: 30 })
  @Audit({ targetType: 'dispatch-task' })
  @ApiOperation({ summary: '人工派单' })
  @ApiOkResponse({ type: ManualAssignVo })
  async assign(
    @Param('taskId') taskId: string,
    @Body() dto: ManualAssignDto,
    @CurrentUser() principal: CurrentPrincipal,
  ): Promise<ManualAssignVo> {
    return this.service.manualAssign(taskId, dto, principal.principalId);
  }
}
