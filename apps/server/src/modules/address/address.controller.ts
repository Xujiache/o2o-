import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { AddressPageVo, ListAddressQueryDto, UpsertAddressDto, UpsertAddressVo } from './address.dto';
import { AddressService } from './address.service';

@ApiTags('customer-address')
@Controller('c/addresses')
@UseGuards(CustomerJwtGuard, PermissionGuard)
@ApiBearerAuth('Customer-Token')
export class AddressController {
  constructor(private readonly service: AddressService) {}

  @Get()
  @RequirePermission('customer:self')
  @ApiOperation({ summary: '收件地址分页(按 isDefault DESC + updatedAt DESC)' })
  @ApiOkResponse({ type: AddressPageVo })
  async list(@CurrentUser() principal: CurrentPrincipal, @Query() query: ListAddressQueryDto): Promise<AddressPageVo> {
    return this.service.list(principal.principalId, query.pageNo, query.pageSize);
  }

  @Post()
  @RequirePermission('customer:self')
  @Idempotent({ scope: 'address:upsert', ttlSeconds: 60 })
  @Audit({ targetType: 'customer-address' })
  @ApiOperation({ summary: '新增/更新收件地址(支持设默认事务)' })
  @ApiOkResponse({ type: UpsertAddressVo })
  async upsert(@CurrentUser() principal: CurrentPrincipal, @Body() dto: UpsertAddressDto): Promise<UpsertAddressVo> {
    return this.service.upsert(principal.principalId, dto);
  }
}
