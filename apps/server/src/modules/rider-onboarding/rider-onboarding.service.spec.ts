import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type {
  FileObject,
  IntegrationRequestLog,
  RiderAccount,
  RiderApplication,
  RiderAuditLog,
  RiderCertificate,
  RiderVehicle,
} from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import type { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';

import { RiderOnboardingService } from './rider-onboarding.service';

describe('RiderOnboardingService', () => {
  let svc: RiderOnboardingService;
  let riders: RiderAccount[];
  let applications: RiderApplication[];
  let vehicles: RiderVehicle[];
  let publishedEvents: Array<{ name: string; payload: unknown }>;
  let nextAppId = 1;

  let riderRepo: jest.Mocked<Repository<RiderAccount>>;
  let appRepo: jest.Mocked<Repository<RiderApplication>>;
  let certRepo: jest.Mocked<Repository<RiderCertificate>>;
  let vehicleRepo: jest.Mocked<Repository<RiderVehicle>>;
  let auditLogRepo: jest.Mocked<Repository<RiderAuditLog>>;
  let fileRepo: jest.Mocked<Repository<FileObject>>;
  let logRepo: jest.Mocked<Repository<IntegrationRequestLog>>;
  let dataSource: { transaction: jest.Mock };
  let gateway: { realname: { verifyFace: jest.Mock } };
  let bus: jest.Mocked<DomainEventBus>;

  const validDto = {
    realName: '骑手张三',
    idCardNo: '110101199001011234',
    healthCertNo: 'HC202501001',
    healthCertExpiry: Date.now() + 86400000 * 365,
    vehicle: { vehicleType: 'electric_bike' as const, plateNo: '京A12345', brand: '雅迪' },
    certificates: [
      { certType: 'id_card_front' as const, fileObjectId: 'file-1' },
      { certType: 'id_card_back' as const, fileObjectId: 'file-2' },
      { certType: 'face_video' as const, fileObjectId: 'file-3' },
      { certType: 'health_cert' as const, fileObjectId: 'file-4' },
      { certType: 'driver_license' as const, fileObjectId: 'file-5' },
    ],
  };

  beforeEach(() => {
    riders = [
      {
        riderId: '1',
        mobile: '13900000001',
        accountStatus: 'active',
        realName: null,
        idCardNo: null,
        healthCertNo: null,
        healthCertExpiry: null,
        approvedAt: null,
        approvedApplicationId: null,
        createdAt: '0',
        updatedAt: '0',
        deletedAt: null,
      } as RiderAccount,
      {
        riderId: '2',
        mobile: '13900000002',
        accountStatus: 'disabled',
        realName: null,
        idCardNo: null,
        healthCertNo: null,
        healthCertExpiry: null,
        approvedAt: null,
        approvedApplicationId: null,
        createdAt: '0',
        updatedAt: '0',
        deletedAt: null,
      } as RiderAccount,
    ];
    applications = [];
    vehicles = [];
    publishedEvents = [];
    nextAppId = 1;

    riderRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<RiderAccount> }) => riders.find((r) => r.riderId === where.riderId) ?? null,
      ),
    } as unknown as jest.Mocked<Repository<RiderAccount>>;

    appRepo = {
      findOne: jest.fn(async ({ where }: { where: Partial<RiderApplication> }) => {
        const matching = applications.filter((a) => (where.mobile ? a.mobile === where.mobile : true));
        matching.sort((a, b) => Number(b.submittedAt) - Number(a.submittedAt));
        return matching[0] ?? null;
      }),
    } as unknown as jest.Mocked<Repository<RiderApplication>>;

    certRepo = {} as never;
    vehicleRepo = {} as never;
    auditLogRepo = { insert: jest.fn(async () => ({ identifiers: [] })) } as unknown as jest.Mocked<
      Repository<RiderAuditLog>
    >;

    fileRepo = {
      find: jest.fn(async ({ where }: { where: Array<{ fileId: string }> }) =>
        where.map((w) => ({ fileId: w.fileId }) as FileObject),
      ),
    } as unknown as jest.Mocked<Repository<FileObject>>;

    logRepo = { insert: jest.fn(async () => ({ identifiers: [] })) } as unknown as jest.Mocked<
      Repository<IntegrationRequestLog>
    >;

    const txAppRepo = {
      create: (dto: Partial<RiderApplication>) => dto as RiderApplication,
      save: async (a: RiderApplication) => {
        const saved = { ...a, applicationId: String(nextAppId++) };
        applications.push(saved);
        return saved;
      },
    };
    const txCertRepo = { insert: jest.fn(async () => ({ identifiers: [] })) };
    const txVehicleRepo = {
      findOne: async ({ where }: { where: Partial<RiderVehicle> }) =>
        vehicles.find((v) => v.riderId === where.riderId) ?? null,
      insert: jest.fn(async (v: RiderVehicle) => {
        vehicles.push({ ...v, vehicleId: String(vehicles.length + 1) } as RiderVehicle);
        return { identifiers: [] };
      }),
      update: jest.fn(),
    };
    const txAuditRepo = { insert: jest.fn(async () => ({ identifiers: [] })) };

    dataSource = {
      transaction: jest.fn(async (cb: (em: EntityManager) => Promise<unknown>) =>
        cb({
          getRepository: (t: { name: string }) => {
            if (t.name === 'RiderApplication') return txAppRepo;
            if (t.name === 'RiderCertificate') return txCertRepo;
            if (t.name === 'RiderVehicle') return txVehicleRepo;
            if (t.name === 'RiderAuditLog') return txAuditRepo;
            return {};
          },
        } as unknown as EntityManager),
      ),
    };

    gateway = {
      realname: {
        verifyFace: jest.fn(async () => ({ success: true, providerRequestId: 'mock-1' })),
      },
    };

    bus = {
      publish: jest.fn(async (name: string, payload: unknown) => {
        publishedEvents.push({ name, payload });
      }),
    } as unknown as jest.Mocked<DomainEventBus>;

    svc = new RiderOnboardingService(
      riderRepo,
      appRepo,
      certRepo,
      vehicleRepo,
      auditLogRepo,
      fileRepo,
      logRepo,
      dataSource as unknown as DataSource,
      gateway as unknown as IntegrationGatewayService,
      bus,
    );
  });

  it('合法入参 → 事务建 application + cert + vehicle + 发 RiderSubmitted', async () => {
    const r = await svc.submit('1', validDto);
    expect(r.applicationId).toBe('1');
    expect(r.auditStatus).toBe('pending');
    expect(applications).toHaveLength(1);
    expect(publishedEvents.find((e) => e.name === EventName.RiderSubmitted)).toBeTruthy();
  });

  it('rider 不存在 → NotFound', async () => {
    await expect(svc.submit('999', validDto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('disabled rider 提交 → STATUS_INVALID', async () => {
    await expect(svc.submit('2', validDto)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('缺少必需 cert_type → INVALID_PARAM', async () => {
    const dto = {
      ...validDto,
      certificates: validDto.certificates.filter((c) => c.certType !== 'face_video'),
    };
    await expect(svc.submit('1', dto)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('已有 pending 申请 → DUPLICATE_REQUEST', async () => {
    applications.push({
      applicationId: '99',
      mobile: '13900000001',
      auditStatus: 'pending',
      submittedAt: '1000',
    } as RiderApplication);
    await expect(svc.submit('1', validDto)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('已 rejected 申请允许重提', async () => {
    applications.push({
      applicationId: '88',
      mobile: '13900000001',
      auditStatus: 'rejected',
      submittedAt: '1000',
    } as RiderApplication);
    const r = await svc.submit('1', validDto);
    expect(r.auditStatus).toBe('pending');
  });

  it('getStatus 无申请 → hasApplication=false', async () => {
    const s = await svc.getStatus('1');
    expect(s.hasApplication).toBe(false);
    expect(s.canResubmit).toBe(true);
  });

  it('getStatus 已 rejected → canResubmit=true', async () => {
    applications.push({
      applicationId: '5',
      mobile: '13900000001',
      auditStatus: 'rejected',
      rejectReason: '资质问题',
      realName: '张三',
      submittedAt: '1000',
    } as RiderApplication);
    const s = await svc.getStatus('1');
    expect(s.hasApplication).toBe(true);
    expect(s.canResubmit).toBe(true);
    expect(s.auditStatus).toBe('rejected');
    expect(s.rejectReason).toBe('资质问题');
  });

  it('getStatus 已 approved → canResubmit=false', async () => {
    applications.push({
      applicationId: '6',
      mobile: '13900000001',
      auditStatus: 'approved',
      realName: '张三',
      submittedAt: '2000',
    } as RiderApplication);
    const s = await svc.getStatus('1');
    expect(s.canResubmit).toBe(false);
  });

  it('rider 不存在 getStatus → NotFound', async () => {
    await expect(svc.getStatus('999')).rejects.toBeInstanceOf(NotFoundException);
  });
});
