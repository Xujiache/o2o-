import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import {
  CategoryMutationVo,
  CategoryTreeVo,
  CreateCategoryDto,
  ListCategoriesQueryDto,
  UpdateCategoryDto,
} from './admin-category.dto';
import { AdminCategoryService } from './admin-category.service';

@ApiTags('admin-category')
@Controller('admin/categories')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminCategoryController {
  constructor(private readonly service: AdminCategoryService) {}

  @Get()
  @RequirePermission('admin:menu:categories')
  @ApiOperation({ summary: '类目树查询(bizType 必填)' })
  @ApiOkResponse({ type: CategoryTreeVo })
  async list(@Query() query: ListCategoriesQueryDto): Promise<CategoryTreeVo> {
    return this.service.listTree(query.bizType);
  }

  @Post()
  @RequirePermission('admin:categories:manage')
  @Idempotent({ scope: 'admin-category:create', ttlSeconds: 60 })
  @Audit({ targetType: 'platform-category' })
  @ApiOperation({ summary: '新增类目(bizType 必填,parentId=0 顶级)' })
  @ApiOkResponse({ type: CategoryMutationVo })
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryMutationVo> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('admin:categories:manage')
  @Idempotent({ scope: 'admin-category:update', ttlSeconds: 30 })
  @Audit({ targetType: 'platform-category' })
  @ApiOperation({ summary: '更新类目(不可改 bizType / parentId)' })
  @ApiOkResponse({ type: CategoryMutationVo })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Promise<CategoryMutationVo> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('admin:categories:manage')
  @Idempotent({ scope: 'admin-category:disable', ttlSeconds: 30 })
  @Audit({ targetType: 'platform-category' })
  @ApiOperation({ summary: '软禁用类目(顶级带启用子项 → 报 HAS_ENABLED_CHILDREN)' })
  @ApiOkResponse({ type: CategoryMutationVo })
  async softDisable(@Param('id') id: string): Promise<CategoryMutationVo> {
    return this.service.softDisable(id);
  }
}
