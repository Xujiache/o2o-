import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { PlatformCategory } from '../../database/entities';

import { AdminCategoryService } from './admin-category.service';

describe('AdminCategoryService', () => {
  let svc: AdminCategoryService;
  let cats: PlatformCategory[];
  let repo: jest.Mocked<Repository<PlatformCategory>>;

  beforeEach(() => {
    cats = [
      {
        categoryId: '1',
        bizType: 'takeaway',
        parentId: '0',
        name: '快餐',
        displayOrder: 1,
        enabled: 1,
        createdAt: '0',
        updatedAt: '0',
        iconUrl: null,
      } as PlatformCategory,
      {
        categoryId: '2',
        bizType: 'takeaway',
        parentId: '1',
        name: '汉堡',
        displayOrder: 1,
        enabled: 1,
        createdAt: '0',
        updatedAt: '0',
        iconUrl: null,
      } as PlatformCategory,
      {
        categoryId: '3',
        bizType: 'errand',
        parentId: '0',
        name: '帮我买',
        displayOrder: 1,
        enabled: 1,
        createdAt: '0',
        updatedAt: '0',
        iconUrl: null,
      } as PlatformCategory,
    ];

    repo = {
      find: jest.fn(async ({ where }: { where?: Partial<PlatformCategory> } = {}) => {
        if (!where) return cats;
        return cats.filter(
          (c) =>
            (!where.bizType || c.bizType === where.bizType) &&
            (where.parentId === undefined || c.parentId === where.parentId) &&
            (where.enabled === undefined || c.enabled === where.enabled),
        );
      }),
      findOne: jest.fn(
        async ({ where }: { where: Partial<PlatformCategory> }) =>
          cats.find(
            (c) =>
              (where.categoryId === undefined || c.categoryId === where.categoryId) &&
              (where.bizType === undefined || c.bizType === where.bizType) &&
              (where.parentId === undefined || c.parentId === where.parentId) &&
              (where.name === undefined || c.name === where.name),
          ) ?? null,
      ),
      create: jest.fn((d: Partial<PlatformCategory>) => ({ ...d, categoryId: '99' }) as PlatformCategory),
      save: jest.fn(async (e: PlatformCategory) => {
        cats.push(e);
        return e;
      }),
      update: jest.fn(async () => ({ affected: 1, raw: [] })),
    } as unknown as jest.Mocked<Repository<PlatformCategory>>;

    svc = new AdminCategoryService(repo);
  });

  it('listTree takeaway 返树形(顶级 + 二级)', async () => {
    const r = await svc.listTree('takeaway');
    expect(r.bizType).toBe('takeaway');
    expect(r.list).toHaveLength(1);
    expect(r.list[0]!.children).toHaveLength(1);
    expect(r.list[0]!.children![0]!.name).toBe('汉堡');
  });

  it('listTree errand 返单顶级', async () => {
    const r = await svc.listTree('errand');
    expect(r.list).toHaveLength(1);
  });

  it('create 顶级类目', async () => {
    const r = await svc.create({ bizType: 'takeaway', name: '中餐' });
    expect(r.categoryId).toBe('99');
  });

  it('create 重名 → DUPLICATE_REQUEST', async () => {
    await expect(svc.create({ bizType: 'takeaway', name: '快餐' })).rejects.toThrow(ConflictException);
  });

  it('create 二级 parent 不存在 → NotFound', async () => {
    await expect(svc.create({ bizType: 'takeaway', parentId: 'no-such', name: 'x' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('create 二级 parent bizType 不匹配 → STATUS_INVALID', async () => {
    // parent '3' 是 errand,这里用 takeaway 但 parentId=3
    await expect(svc.create({ bizType: 'takeaway', parentId: '3', name: 'x' })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('create 不允许 3 层(parent.parentId !== 0)', async () => {
    // parent '2' 是二级,再以 '2' 为 parent → 三层
    await expect(svc.create({ bizType: 'takeaway', parentId: '2', name: 'x' })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('softDisable 顶级有启用子项 → HAS_ENABLED_CHILDREN', async () => {
    await expect(svc.softDisable('1')).rejects.toThrow(UnprocessableEntityException);
  });

  it('softDisable 二级类目 → 直接禁用', async () => {
    const r = await svc.softDisable('2');
    expect(r.categoryId).toBe('2');
  });
});
