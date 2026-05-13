import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  BatchConfigSlotsDto,
  CreatePickupPointDto,
  type PickupPointVo,
  type PickupSlotVo,
  UpdatePickupPointDto,
} from './pickup-point.dto';
import { PickupPointService } from './pickup-point.service';

@ApiTags('customer-pickup-point')
@Controller('c/pickup-points')
@Public()
export class PickupPointCustomerController {
  constructor(private readonly service: PickupPointService) {}

  @Get()
  @ApiOperation({ summary: '自提点列表(按距离/关键词)' })
  async list(
    @Query('lng') lng?: string,
    @Query('lat') lat?: string,
    @Query('keyword') keyword?: string,
  ): Promise<PickupPointVo[]> {
    const lngN = lng !== undefined ? Number(lng) : undefined;
    const latN = lat !== undefined ? Number(lat) : undefined;
    return this.service.listForCustomer(lngN, latN, keyword);
  }

  @Get(':id')
  @ApiOperation({ summary: '自提点详情' })
  async detail(@Param('id') id: string): Promise<PickupPointVo> {
    return this.service.detail(id);
  }

  @Get(':id/slots')
  @ApiOperation({ summary: '某日可选时段(仅 remain>0)' })
  async slots(@Param('id') id: string, @Query('date') date: string): Promise<PickupSlotVo[]> {
    const all = await this.service.listSlotsByDate(id, date);
    return all.filter((s) => s.remain > 0);
  }
}

@ApiTags('merchant-pickup-point')
@Controller('m/pickup-points')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth('Merchant-Token')
export class PickupPointMerchantController {
  constructor(private readonly service: PickupPointService) {}

  @Get()
  @ApiOperation({ summary: '本商家自提点列表' })
  async list(@CurrentUser() p: CurrentPrincipal): Promise<PickupPointVo[]> {
    return this.service.listForMerchant(p.principalId);
  }

  @Post()
  @Idempotent({ scope: 'pickup-point:create', ttlSeconds: 60 })
  @Audit({ targetType: 'pickup-point' })
  @ApiOperation({ summary: '新建自提点' })
  async create(@CurrentUser() p: CurrentPrincipal, @Body() dto: CreatePickupPointDto): Promise<PickupPointVo> {
    return this.service.createForMerchant(p.principalId, dto);
  }

  @Patch(':id')
  @Audit({ targetType: 'pickup-point' })
  @ApiOperation({ summary: '编辑自提点' })
  async update(
    @CurrentUser() p: CurrentPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdatePickupPointDto,
  ): Promise<PickupPointVo> {
    return this.service.updateForMerchant(p.principalId, id, dto);
  }

  @Post(':id/slots/batch')
  @Idempotent({ scope: 'pickup-slot:batch', ttlSeconds: 30 })
  @Audit({ targetType: 'pickup-slot' })
  @ApiOperation({ summary: '批量配置时段(按日复制 N 天)' })
  async batchConfigSlots(
    @CurrentUser() p: CurrentPrincipal,
    @Param('id') id: string,
    @Body() dto: BatchConfigSlotsDto,
  ): Promise<{ created: number; skipped: number; updated: number }> {
    return this.service.batchConfigSlots(p.principalId, id, dto);
  }

  @Get(':id/slots')
  @ApiOperation({ summary: '查看本店时段(按日期范围)' })
  async listSlots(
    @CurrentUser() p: CurrentPrincipal,
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<PickupSlotVo[]> {
    return this.service.listSlotsRangeForMerchant(p.principalId, id, from, to);
  }
}
