import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RiderJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  AcceptTaskDto,
  AcceptTaskVo,
  ArrivePickupDto,
  ArrivePickupVo,
  DeliveredDto,
  DeliveredVo,
  ExceptionDto,
  ExceptionVo,
  PickupDto,
  PickupVo,
  RiderTaskDetailVo,
} from './rider-task.dto';
import { RiderTaskService } from './rider-task.service';

@ApiTags('rider-task')
@Controller('r/tasks')
@UseGuards(RiderJwtGuard, PermissionGuard)
@ApiBearerAuth('Rider-Token')
export class RiderTaskController {
  constructor(private readonly service: RiderTaskService) {}

  @Get(':taskId')
  @RequirePermission('rider:self')
  @ApiOperation({ summary: '骑手任务详情' })
  @ApiOkResponse({ type: RiderTaskDetailVo })
  async detail(@CurrentUser() p: CurrentPrincipal, @Param('taskId') taskId: string): Promise<RiderTaskDetailVo> {
    return this.service.detail(p.principalId, taskId);
  }

  @Post(':taskId/accept')
  @Idempotent({ scope: 'rider-task:accept', ttlSeconds: 60 })
  @Audit({ targetType: 'rider-task' })
  @RequirePermission('rider:self')
  @ApiOperation({ summary: '抢单/接单(taskId 是 dispatchTaskId)' })
  @ApiOkResponse({ type: AcceptTaskVo })
  async accept(
    @CurrentUser() p: CurrentPrincipal,
    @Param('taskId') taskId: string,
    @Body() dto: AcceptTaskDto,
  ): Promise<AcceptTaskVo> {
    return this.service.accept(p.principalId, taskId, dto);
  }

  @Post(':taskId/arrive-pickup')
  @Idempotent({ scope: 'rider-task:arrive-pickup', ttlSeconds: 60 })
  @Audit({ targetType: 'rider-task' })
  @RequirePermission('rider:self')
  @ApiOperation({ summary: '到达取货点' })
  @ApiOkResponse({ type: ArrivePickupVo })
  async arrivePickup(
    @CurrentUser() p: CurrentPrincipal,
    @Param('taskId') taskId: string,
    @Body() dto: ArrivePickupDto,
  ): Promise<ArrivePickupVo> {
    return this.service.arrivePickup(p.principalId, taskId, dto);
  }

  @Post(':taskId/pickup')
  @Idempotent({ scope: 'rider-task:pickup', ttlSeconds: 60 })
  @Audit({ targetType: 'rider-task' })
  @RequirePermission('rider:self')
  @ApiOperation({ summary: '确认取货' })
  @ApiOkResponse({ type: PickupVo })
  async pickup(
    @CurrentUser() p: CurrentPrincipal,
    @Param('taskId') taskId: string,
    @Body() dto: PickupDto,
  ): Promise<PickupVo> {
    return this.service.pickup(p.principalId, taskId, dto);
  }

  @Post(':taskId/delivered')
  @Idempotent({ scope: 'rider-task:delivered', ttlSeconds: 60 })
  @Audit({ targetType: 'rider-task' })
  @RequirePermission('rider:self')
  @ApiOperation({ summary: '确认送达' })
  @ApiOkResponse({ type: DeliveredVo })
  async delivered(
    @CurrentUser() p: CurrentPrincipal,
    @Param('taskId') taskId: string,
    @Body() dto: DeliveredDto,
  ): Promise<DeliveredVo> {
    return this.service.delivered(p.principalId, taskId, dto);
  }

  @Post(':taskId/exception')
  @Idempotent({ scope: 'rider-task:exception', ttlSeconds: 60 })
  @Audit({ targetType: 'rider-violation' })
  @RequirePermission('rider:self')
  @ApiOperation({ summary: '异常报备' })
  @ApiOkResponse({ type: ExceptionVo })
  async exception(
    @CurrentUser() p: CurrentPrincipal,
    @Param('taskId') taskId: string,
    @Body() dto: ExceptionDto,
  ): Promise<ExceptionVo> {
    return this.service.exception(p.principalId, taskId, dto);
  }
}
