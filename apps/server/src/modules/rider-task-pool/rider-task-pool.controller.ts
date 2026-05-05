import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RiderJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { TaskPoolQueryDto, TaskPoolVo } from './rider-task-pool.dto';
import { RiderTaskPoolService } from './rider-task-pool.service';

@ApiTags('rider-task-pool')
@Controller('r/tasks')
@UseGuards(RiderJwtGuard, PermissionGuard)
@ApiBearerAuth('Rider-Token')
export class RiderTaskPoolController {
  constructor(private readonly service: RiderTaskPoolService) {}

  @Get('available')
  @RequirePermission('rider:self')
  @ApiOperation({ summary: '可接单列表(本阶段返回空骨架,等 stage 5/6 真订单)' })
  @ApiOkResponse({ type: TaskPoolVo })
  async listAvailable(
    @CurrentUser() principal: CurrentPrincipal,
    @Query() query: TaskPoolQueryDto,
  ): Promise<TaskPoolVo> {
    return this.service.listAvailable(principal.principalId, query);
  }
}
