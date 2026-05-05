import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type { AdminUser, SysPermission, SysRole, SysRolePermission } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import { AdminRolePermissionService } from './admin-role-permission.service';

describe('AdminRolePermissionService', () => {
  let svc: AdminRolePermissionService;
  let roles: SysRole[];
  let perms: SysPermission[];
  let bindings: SysRolePermission[];
  let publishedEvents: Array<{ name: string; payload: unknown }>;

  let roleRepo: jest.Mocked<Repository<SysRole>>;
  let permRepo: jest.Mocked<Repository<SysPermission>>;
  let rpRepo: jest.Mocked<Repository<SysRolePermission>>;
  let adminRepo: jest.Mocked<Repository<AdminUser>>;
  let bus: jest.Mocked<DomainEventBus>;
  let ds: jest.Mocked<DataSource>;

  beforeEach(() => {
    roles = [
      { id: '1', code: 'SUPER_ADMIN', name: '超级管理员', scope: 'admin', enabled: 1, createdAt: '0' } as SysRole,
      { id: '2', code: 'AUDITOR', name: '审核员', scope: 'admin', enabled: 1, createdAt: '0' } as SysRole,
      { id: '3', code: 'CUSTOM_ROLE', name: '自定义', scope: 'admin', enabled: 1, createdAt: '0' } as SysRole,
    ];
    perms = [
      {
        id: '100',
        code: 'admin:menu:audit-logs',
        name: 'X',
        type: 'menu',
        scope: 'admin',
        parentCode: null,
        sort: 0,
      } as SysPermission,
      {
        id: '101',
        code: 'admin:audit:logs:view',
        name: 'X',
        type: 'data',
        scope: 'admin',
        parentCode: null,
        sort: 0,
      } as SysPermission,
      {
        id: '102',
        code: 'admin:cities:manage',
        name: 'X',
        type: 'button',
        scope: 'admin',
        parentCode: null,
        sort: 0,
      } as SysPermission,
    ];
    bindings = [
      { roleId: '1', permissionId: '100', createdAt: '0' } as SysRolePermission,
      { roleId: '1', permissionId: '101', createdAt: '0' } as SysRolePermission,
      { roleId: '1', permissionId: '102', createdAt: '0' } as SysRolePermission,
      { roleId: '2', permissionId: '100', createdAt: '0' } as SysRolePermission,
    ];

    roleRepo = {
      find: jest.fn(async () => roles),
      findOne: jest.fn(async ({ where }: { where: Partial<SysRole> }) => roles.find((r) => r.id === where.id) ?? null),
    } as unknown as jest.Mocked<Repository<SysRole>>;

    permRepo = {
      find: jest.fn(
        async (opts?: {
          where?: { id?: { _type: string; _value: string[] }; code?: { _type: string; _value: string[] } };
        }) => {
          if (!opts?.where) return perms;
          // crude In() handling: just return all
          const w = opts.where as unknown as { id?: { _value: string[] }; code?: { _value: string[] } };
          if (w.id?._value) return perms.filter((p) => w.id!._value.includes(p.id));
          if (w.code?._value) return perms.filter((p) => w.code!._value.includes(p.code));
          return perms;
        },
      ),
    } as unknown as jest.Mocked<Repository<SysPermission>>;

    rpRepo = {
      find: jest.fn(async (opts?: { where?: { roleId?: string | { _value: string[] } } }) => {
        if (!opts?.where?.roleId) return bindings;
        const v = opts.where.roleId as string | { _value: string[] };
        if (typeof v === 'string') return bindings.filter((b) => b.roleId === v);
        return bindings.filter((b) => v._value.includes(b.roleId));
      }),
    } as unknown as jest.Mocked<Repository<SysRolePermission>>;

    adminRepo = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn(async () => 2),
      })),
    } as unknown as jest.Mocked<Repository<AdminUser>>;

    publishedEvents = [];
    bus = {
      publish: jest.fn(async (name: string, payload: unknown) => {
        publishedEvents.push({ name, payload });
        return { eventId: 'evt' };
      }),
    } as unknown as jest.Mocked<DomainEventBus>;

    ds = {
      transaction: jest.fn(async (cb: (em: EntityManager) => Promise<unknown>) =>
        cb({
          delete: jest.fn(async (_e: unknown, criteria: Partial<SysRolePermission>) => {
            const beforeLen = bindings.length;
            bindings = bindings.filter((b) => b.roleId !== criteria.roleId);
            return { affected: beforeLen - bindings.length, raw: [] };
          }),
          insert: jest.fn(async (_e: unknown, rows: SysRolePermission[]) => {
            bindings.push(...rows);
            return { identifiers: [], generatedMaps: [], raw: [] };
          }),
        } as unknown as EntityManager),
      ),
    } as unknown as jest.Mocked<DataSource>;

    svc = new AdminRolePermissionService(roleRepo, permRepo, rpRepo, adminRepo, ds, bus);
  });

  it('listRoles 返带 permissionCodes', async () => {
    const r = await svc.listRoles();
    expect(r.list).toHaveLength(3);
    const sa = r.list.find((x) => x.code === 'SUPER_ADMIN');
    expect(sa!.permissionCodes).toEqual(expect.arrayContaining(['admin:menu:audit-logs', 'admin:cities:manage']));
  });

  it('listPermissionTree 按 scope 分组', async () => {
    const r = await svc.listPermissionTree();
    expect(r.groups.find((g) => g.group === 'admin')).toBeTruthy();
    const adminGroup = r.groups.find((g) => g.group === 'admin')!;
    expect(adminGroup.permissions.length).toBeGreaterThanOrEqual(3);
  });

  it('updateRolePermissions 不存在 roleId → NotFound', async () => {
    await expect(svc.updateRolePermissions('999', ['admin:menu:audit-logs'], 'admin-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updateRolePermissions 内置角色清空 → STATUS_INVALID', async () => {
    await expect(svc.updateRolePermissions('1', [], 'admin-1')).rejects.toThrow(UnprocessableEntityException);
  });

  it('updateRolePermissions 不存在权限码 → STATUS_INVALID', async () => {
    await expect(svc.updateRolePermissions('3', ['no:such:perm'], 'admin-1')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('updateRolePermissions 成功 → 事务覆盖式重建 + 发 RoleChanged', async () => {
    const r = await svc.updateRolePermissions('2', ['admin:menu:audit-logs', 'admin:audit:logs:view'], 'admin-1');
    expect(r.appliedCodes).toEqual(['admin:menu:audit-logs', 'admin:audit:logs:view']);
    expect(r.affectedAdminUsers).toBe(2);
    expect(publishedEvents).toEqual([
      expect.objectContaining({
        name: EventName.RoleChanged,
        payload: expect.objectContaining({ roleId: '2', roleCode: 'AUDITOR' }),
      }),
    ]);
  });

  it('updateRolePermissions 自定义角色允许清空', async () => {
    const r = await svc.updateRolePermissions('3', [], 'admin-1');
    expect(r.appliedCodes).toEqual([]);
  });
});
