import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { PlatformCategory, type PlatformCategoryBizType } from '../../database/entities';

import {
  CategoryItemVo,
  CategoryMutationVo,
  CategoryTreeVo,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './admin-category.dto';

@Injectable()
export class AdminCategoryService {
  constructor(@InjectRepository(PlatformCategory) private readonly repo: Repository<PlatformCategory>) {}

  async listTree(bizType: PlatformCategoryBizType): Promise<CategoryTreeVo> {
    const rows = await this.repo.find({
      where: { bizType },
      order: { displayOrder: 'ASC', categoryId: 'ASC' },
    });
    const topLevel = rows.filter((r) => r.parentId === '0');
    const list = topLevel.map((t) =>
      this.toVo(
        t,
        rows.filter((r) => r.parentId === t.categoryId),
      ),
    );
    return { bizType, list };
  }

  private toVo(row: PlatformCategory, children: PlatformCategory[]): CategoryItemVo {
    return {
      categoryId: row.categoryId,
      bizType: row.bizType,
      parentId: row.parentId,
      name: row.name,
      iconUrl: row.iconUrl,
      displayOrder: row.displayOrder,
      enabled: row.enabled === 1,
      children: children.length ? children.map((c) => this.toVo(c, [])) : undefined,
    };
  }

  async create(dto: CreateCategoryDto): Promise<CategoryMutationVo> {
    const parentId = dto.parentId ?? '0';
    if (parentId !== '0') {
      const parent = await this.repo.findOne({ where: { categoryId: parentId } });
      if (!parent) {
        throw new NotFoundException('parent category not found');
      }
      if (parent.bizType !== dto.bizType) {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          message: 'parent bizType 不匹配',
        });
      }
      if (parent.parentId !== '0') {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          message: '不允许 3 层类目',
        });
      }
    }
    const existing = await this.repo.findOne({
      where: { bizType: dto.bizType, parentId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException({ code: ErrorCode.DUPLICATE_REQUEST, message: '类目名重复' });
    }
    const now = String(Date.now());
    const created = this.repo.create({
      bizType: dto.bizType,
      parentId,
      name: dto.name,
      iconUrl: dto.iconUrl ?? null,
      displayOrder: dto.displayOrder ?? 0,
      enabled: 1,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.repo.save(created);
    return { categoryId: saved.categoryId, updatedAt: saved.updatedAt };
  }

  async update(categoryId: string, dto: UpdateCategoryDto): Promise<CategoryMutationVo> {
    const c = await this.repo.findOne({ where: { categoryId } });
    if (!c) throw new NotFoundException('category not found');
    if (dto.name && dto.name !== c.name) {
      const dup = await this.repo.findOne({
        where: { bizType: c.bizType, parentId: c.parentId, name: dto.name },
      });
      if (dup) {
        throw new ConflictException({ code: ErrorCode.DUPLICATE_REQUEST, message: '类目名重复' });
      }
    }
    const now = String(Date.now());
    const patch: Partial<PlatformCategory> = { updatedAt: now };
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.iconUrl !== undefined) patch.iconUrl = dto.iconUrl;
    if (dto.displayOrder !== undefined) patch.displayOrder = dto.displayOrder;
    if (dto.enabled !== undefined) patch.enabled = dto.enabled ? 1 : 0;
    await this.repo.update({ categoryId }, patch);
    return { categoryId, updatedAt: now };
  }

  async softDisable(categoryId: string): Promise<CategoryMutationVo> {
    const c = await this.repo.findOne({ where: { categoryId } });
    if (!c) throw new NotFoundException('category not found');
    // 检查二级子类目还是 enabled → 拒绝
    if (c.parentId === '0') {
      const children = await this.repo.find({ where: { parentId: categoryId, enabled: 1 } });
      if (children.length) {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          detail: 'HAS_ENABLED_CHILDREN',
          message: '请先禁用子类目',
        });
      }
    }
    const now = String(Date.now());
    await this.repo.update({ categoryId }, { enabled: 0, updatedAt: now });
    return { categoryId, updatedAt: now };
  }
}
