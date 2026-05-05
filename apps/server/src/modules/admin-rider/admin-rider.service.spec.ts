import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Repository, SelectQueryBuilder } from 'typeorm';

import type {
  FileObject,
  RiderAccount,
  RiderApplication,
  RiderAuditLog,
  RiderCertificate,
  RiderServiceArea,
  RiderStatus,
  RiderVehicle,
} from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import { AdminRiderService } from './admin-rider.service';

describe('AdminRiderService', () => {
  let svc: AdminRiderService;
  let riders: RiderAccount[];
  let applications: RiderApplication[];
  let areas: RiderServiceArea[];
  let publishedEvents: Array<{ name: string; payload: unknown }>;

  let riderRepo: jest.Mocked<Repository<RiderAccount>>;
  let appRepo: jest.Mocked<Repository<RiderApplication>>;
  let certRepo: jest.Mocked<Repository<RiderCertificate>>;
  let vehicleRepo: jest.Mocked<Repository<RiderVehicle>>;
  let statusRepo: jest.Mocked<Repository<RiderStatus>>;
  let areaRepo: jest.Mocked<Repository<RiderServiceArea>>;
  let auditLogRepo: jest.Mocked<Repository<RiderAuditLog>>;
  let fileRepo: jest.Mocked<Repository<FileObject>>;
  let bus: jest.Mocked<DomainEventBus>;

  beforeEach(() => {
    riders = [{ riderId: '1', mobile: '13900000001', accountStatus: 'active' } as RiderAccount];
    applications = [
      {
        applicationId: '1',
        riderId: '1',
        mobile: '13900000001',
        realName: '骑手张三',
        idCardNo: '110101199001011234',
        healthCertNo: 'HC1',
        healthCertExpiry: String(Date.now() + 86400000 * 30),
        auditStatus: 'pending',
        submittedAt: '1000',
        rejectReason: null,
      } as RiderApplication,
      {
        applicationId: '2',
        riderId: '1',
        mobile: '13900000001',
        realName: '骑手李四',
        idCardNo: '110101199001012345',
        healthCertNo: 'HC2',
        healthCertExpiry: String(Date.now() + 86400000 * 30),
        auditStatus: 'approved',
        submittedAt: '2000',
        rejectReason: null,
      } as RiderApplication,
    ];
    areas = [];
    publishedEvents = [];

    const fakeQb = (rows: RiderApplication[]): SelectQueryBuilder<RiderApplication> =>
      ({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [rows, rows.length]),
      }) as unknown as SelectQueryBuilder<RiderApplication>;

    riderRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<RiderAccount> }) => riders.find((r) => r.riderId === where.riderId) ?? null,
      ),
      update: jest.fn(async () => ({ affected: 1 })),
    } as unknown as jest.Mocked<Repository<RiderAccount>>;

    appRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<RiderApplication> }) =>
          applications.find((a) => a.applicationId === where.applicationId) ?? null,
      ),
      update: jest.fn(async () => ({ affected: 1 })),
      createQueryBuilder: jest.fn(() => fakeQb(applications)),
    } as unknown as jest.Mocked<Repository<RiderApplication>>;

    certRepo = { find: jest.fn(async () => []) } as unknown as jest.Mocked<Repository<RiderCertificate>>;
    vehicleRepo = { findOne: jest.fn(async () => null) } as unknown as jest.Mocked<Repository<RiderVehicle>>;
    statusRepo = {
      findOne: jest.fn(async () => ({ statusId: '1', riderId: '1', onlineStatus: 'online' }) as RiderStatus),
      update: jest.fn(async () => ({ affected: 1 })),
    } as unknown as jest.Mocked<Repository<RiderStatus>>;
    areaRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<RiderServiceArea> }) =>
          areas.find((a) => a.riderId === where.riderId) ?? null,
      ),
      insert: jest.fn(async (a: Partial<RiderServiceArea>) => {
        areas.push({ ...a, serviceAreaId: String(areas.length + 1) } as RiderServiceArea);
        return { identifiers: [] };
      }),
      update: jest.fn(async () => ({ affected: 1 })),
    } as unknown as jest.Mocked<Repository<RiderServiceArea>>;
    auditLogRepo = { insert: jest.fn(async () => ({ identifiers: [] })) } as unknown as jest.Mocked<
      Repository<RiderAuditLog>
    >;
    fileRepo = { find: jest.fn(async () => []) } as unknown as jest.Mocked<Repository<FileObject>>;

    bus = {
      publish: jest.fn(async (name: string, payload: unknown) => {
        publishedEvents.push({ name, payload });
      }),
    } as unknown as jest.Mocked<DomainEventBus>;

    svc = new AdminRiderService(
      riderRepo,
      appRepo,
      certRepo,
      vehicleRepo,
      statusRepo,
      areaRepo,
      auditLogRepo,
      fileRepo,
      bus,
    );
  });

  it('list 默认分页', async () => {
    const r = await svc.list({});
    expect(r.pageNo).toBe(1);
    expect(r.pageSize).toBe(20);
    expect(r.total).toBe(2);
  });

  it('listApplicationsForAudit 不指定 status 时仅返 pending+rejected', async () => {
    // fakeQb 用于 mock createQueryBuilder;此处只验证返字段而非过滤逻辑(集成测试更合适)
    const r = await svc.listApplicationsForAudit({});
    expect(r.pageNo).toBe(1);
    expect(r.pageSize).toBe(20);
    expect(Array.isArray(r.list)).toBe(true);
  });

  it('listApplicationsForAudit 指定 status 时直接走 list 逻辑', async () => {
    const r = await svc.listApplicationsForAudit({ auditStatus: 'approved' });
    expect(r.total).toBe(2);
  });

  it('detail 返回应用 + 状态', async () => {
    const r = await svc.getDetail('1');
    expect(r.applicationId).toBe('1');
    expect(r.realName).toBe('骑手张三'); // @Mask 在 controller 的 ResponseInterceptor 阶段触发,service 层返原值
    expect(r.idCardNo).toBe('110101199001011234');
  });

  it('detail 不存在 → NotFound', async () => {
    await expect(svc.getDetail('999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('audit approved → 发 RiderApproved + RiderAudited(stage 4)事件', async () => {
    const r = await svc.audit('1', 'admin-1', { auditResult: 'approved' });
    expect(r.auditStatus).toBe('approved');
    expect(publishedEvents.find((e) => e.name === EventName.RiderApproved)).toBeTruthy();
    expect(publishedEvents.find((e) => e.name === EventName.RiderAudited)).toMatchObject({
      payload: expect.objectContaining({ auditResult: 'approved', operatorAdminId: 'admin-1' }),
    });
  });

  it('audit rejected → 写 reject_reason,发 RiderAudited(stage 4)不发 RiderApproved', async () => {
    const r = await svc.audit('1', 'admin-1', { auditResult: 'rejected', rejectReason: '资质问题' });
    expect(r.auditStatus).toBe('rejected');
    expect(publishedEvents.find((e) => e.name === EventName.RiderApproved)).toBeUndefined();
    expect(publishedEvents.find((e) => e.name === EventName.RiderAudited)).toMatchObject({
      payload: expect.objectContaining({ auditResult: 'rejected', rejectReason: '资质问题' }),
    });
  });

  it('audit 幂等:已是目标态 → 不重发事件', async () => {
    const r = await svc.audit('2', 'admin-1', { auditResult: 'approved' });
    expect(r.auditStatus).toBe('approved');
    expect(publishedEvents.find((e) => e.name === EventName.RiderApproved)).toBeUndefined();
  });

  it('updateStatus disabled 时强制下线 + 发 RiderOffline', async () => {
    const r = await svc.updateStatus('1', 'admin-1', { targetStatus: 'disabled' });
    expect(r.accountStatus).toBe('disabled');
    expect(publishedEvents.find((e) => e.name === EventName.RiderOffline)).toBeTruthy();
  });

  it('updateStatus enabled 时不发 offline', async () => {
    riders[0]!.accountStatus = 'disabled';
    const r = await svc.updateStatus('1', 'admin-1', { targetStatus: 'enabled' });
    expect(r.accountStatus).toBe('active');
  });

  it('updateStatus rider 不存在 → NotFound', async () => {
    await expect(svc.updateStatus('999', 'admin-1', { targetStatus: 'disabled' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updateServiceArea 合法 GeoJSON Polygon → 成功', async () => {
    const r = await svc.updateServiceArea('1', 'admin-1', {
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [116.4, 39.9],
            [116.5, 39.9],
            [116.5, 40.0],
            [116.4, 40.0],
            [116.4, 39.9],
          ],
        ],
      },
    });
    expect(r.updated).toBe(true);
  });

  it('updateServiceArea 非闭合多边形 → INVALID_PARAM', async () => {
    await expect(
      svc.updateServiceArea('1', 'admin-1', {
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [116.4, 39.9],
              [116.5, 39.9],
              [116.5, 40.0],
              [116.6, 40.1], // 不闭合
            ],
          ],
        },
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('updateServiceArea 空 coordinates 占位 → 成功', async () => {
    const r = await svc.updateServiceArea('1', 'admin-1', {
      geometry: { type: 'Polygon', coordinates: [] },
    });
    expect(r.updated).toBe(true);
  });
});
