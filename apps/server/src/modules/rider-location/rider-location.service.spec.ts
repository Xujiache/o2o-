import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type {
  IntegrationRequestLog,
  RiderAccount,
  RiderApplication,
  RiderAuditLog,
  RiderLocation,
  RiderStatus,
} from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import type { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';

import { RiderLocationService } from './rider-location.service';

describe('RiderLocationService', () => {
  let svc: RiderLocationService;
  let riders: RiderAccount[];
  let applications: RiderApplication[];
  let statuses: RiderStatus[];
  let publishedEvents: Array<{ name: string; payload: unknown }>;

  let riderRepo: jest.Mocked<Repository<RiderAccount>>;
  let appRepo: jest.Mocked<Repository<RiderApplication>>;
  let statusRepo: jest.Mocked<Repository<RiderStatus>>;
  let locationRepo: jest.Mocked<Repository<RiderLocation>>;
  let auditLogRepo: jest.Mocked<Repository<RiderAuditLog>>;
  let integLogRepo: jest.Mocked<Repository<IntegrationRequestLog>>;
  let dataSource: { transaction: jest.Mock };
  let gateway: { getui: { bindDevice: jest.Mock } };
  let bus: jest.Mocked<DomainEventBus>;

  beforeEach(() => {
    riders = [
      {
        riderId: '1',
        mobile: '13900000001',
        accountStatus: 'active',
        healthCertExpiry: String(Date.now() + 86400000 * 30),
      } as RiderAccount,
      {
        riderId: '2',
        mobile: '13900000002',
        accountStatus: 'active',
        healthCertExpiry: String(Date.now() - 86400000), // 已过期
      } as RiderAccount,
      {
        riderId: '3',
        mobile: '13900000003',
        accountStatus: 'disabled',
        healthCertExpiry: null,
      } as RiderAccount,
    ];
    applications = [
      { applicationId: '1', mobile: '13900000001', auditStatus: 'approved', submittedAt: '1000' } as RiderApplication,
      { applicationId: '2', mobile: '13900000002', auditStatus: 'approved', submittedAt: '1000' } as RiderApplication,
      { applicationId: '3', mobile: '13900000003', auditStatus: 'pending', submittedAt: '1000' } as RiderApplication,
    ];
    statuses = [
      { statusId: '1', riderId: '1', onlineStatus: 'offline' } as RiderStatus,
      { statusId: '2', riderId: '2', onlineStatus: 'offline' } as RiderStatus,
    ];
    publishedEvents = [];

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

    statusRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<RiderStatus> }) => statuses.find((s) => s.riderId === where.riderId) ?? null,
      ),
      update: jest.fn(async () => ({ affected: 1 })),
    } as unknown as jest.Mocked<Repository<RiderStatus>>;

    locationRepo = { insert: jest.fn(async () => ({ identifiers: [] })) } as unknown as jest.Mocked<
      Repository<RiderLocation>
    >;
    auditLogRepo = { insert: jest.fn(async () => ({ identifiers: [] })) } as unknown as jest.Mocked<
      Repository<RiderAuditLog>
    >;
    integLogRepo = { insert: jest.fn(async () => ({ identifiers: [] })) } as unknown as jest.Mocked<
      Repository<IntegrationRequestLog>
    >;

    dataSource = {
      transaction: jest.fn(async (cb: (em: EntityManager) => Promise<unknown>) =>
        cb({
          getRepository: (t: { name: string }) => {
            if (t.name === 'RiderLocation') return { insert: jest.fn(async () => ({ identifiers: [] })) };
            if (t.name === 'RiderStatus') return { update: jest.fn(async () => ({ affected: 1 })) };
            return {};
          },
        } as unknown as EntityManager),
      ),
    };

    gateway = {
      getui: {
        bindDevice: jest.fn(async () => ({ success: true, providerRequestId: 'mock-bind-1' })),
      },
    };

    bus = {
      publish: jest.fn(async (name: string, payload: unknown) => {
        publishedEvents.push({ name, payload });
      }),
    } as unknown as jest.Mocked<DomainEventBus>;

    svc = new RiderLocationService(
      riderRepo,
      appRepo,
      statusRepo,
      locationRepo,
      auditLogRepo,
      integLogRepo,
      dataSource as unknown as DataSource,
      gateway as unknown as IntegrationGatewayService,
      bus,
    );
  });

  it('approved+健康证未过期 上线 → 成功 + 发 RiderOnline', async () => {
    const r = await svc.updateOnlineStatus('1', { targetStatus: 'online', deviceToken: 'd1', platform: 'android' });
    expect(r.riderStatus).toBe('online');
    expect(r.canAcceptOrder).toBe(true);
    expect(publishedEvents.find((e) => e.name === EventName.RiderOnline)).toBeTruthy();
  });

  it('disabled rider 上线 → STATUS_INVALID', async () => {
    await expect(svc.updateOnlineStatus('3', { targetStatus: 'online' })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('未 approved 上线 → STATUS_INVALID', async () => {
    riders.push({
      riderId: '4',
      mobile: '13900000004',
      accountStatus: 'active',
      healthCertExpiry: null,
    } as RiderAccount);
    statuses.push({ statusId: '4', riderId: '4', onlineStatus: 'offline' } as RiderStatus);
    await expect(svc.updateOnlineStatus('4', { targetStatus: 'online' })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('健康证已过期 上线 → STATUS_INVALID', async () => {
    await expect(svc.updateOnlineStatus('2', { targetStatus: 'online' })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('下线 → 成功 + 发 RiderOffline', async () => {
    const r = await svc.updateOnlineStatus('1', { targetStatus: 'offline' });
    expect(r.riderStatus).toBe('offline');
    expect(r.canAcceptOrder).toBe(false);
    expect(publishedEvents.find((e) => e.name === EventName.RiderOffline)).toBeTruthy();
  });

  it('rider 不存在 → NotFound', async () => {
    await expect(svc.updateOnlineStatus('999', { targetStatus: 'online' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('batch 上报 50 点 → 成功', async () => {
    const points = Array.from({ length: 50 }, (_, i) => ({
      lng: 116.4 + i * 0.001,
      lat: 39.9 + i * 0.001,
      reportedAt: Date.now() + i,
    }));
    const r = await svc.batchReport('1', { batchId: 'B1', points });
    expect(r.acceptedCount).toBe(50);
    expect(publishedEvents.find((e) => e.name === EventName.RiderLocationUpdated)).toBeTruthy();
  });

  it('batch 上报 1 点 → 成功', async () => {
    const r = await svc.batchReport('1', {
      batchId: 'B2',
      points: [{ lng: 116.4, lat: 39.9, reportedAt: Date.now() }],
    });
    expect(r.acceptedCount).toBe(1);
  });

  it('batch 上报 status 未初始化 → NotFound', async () => {
    await expect(
      svc.batchReport('999', { batchId: 'B3', points: [{ lng: 0, lat: 0, reportedAt: 0 }] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
