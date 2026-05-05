import type { DataSource, EntityManager } from 'typeorm';

import type { RiderAccount, RiderApplication, RiderServiceArea, RiderStatus } from '../../database/entities';

import { RiderApprovedSubscriber } from './rider-approved.subscriber';

describe('RiderApprovedSubscriber', () => {
  let sub: RiderApprovedSubscriber;
  let riders: RiderAccount[];
  let applications: RiderApplication[];
  let statuses: RiderStatus[];
  let areas: RiderServiceArea[];

  beforeEach(() => {
    riders = [
      {
        riderId: '1',
        mobile: '13900000001',
        accountStatus: 'active',
        approvedAt: null,
        approvedApplicationId: null,
      } as RiderAccount,
    ];
    applications = [
      {
        applicationId: '1',
        riderId: '1',
        mobile: '13900000001',
        realName: '骑手张三',
        idCardNo: '110101199001011234',
        healthCertNo: 'HC1',
        healthCertExpiry: '1888888888888',
        auditStatus: 'approved',
        submittedAt: '1000',
      } as RiderApplication,
    ];
    statuses = [];
    areas = [];

    const em = {
      getRepository: (t: { name: string }) => {
        if (t.name === 'RiderAccount') {
          return {
            findOne: async ({ where }: { where: Partial<RiderAccount> }) =>
              riders.find((r) => r.riderId === where.riderId) ?? null,
            update: async (criteria: Partial<RiderAccount>, patch: Partial<RiderAccount>) => {
              const r = riders.find((x) => x.riderId === criteria.riderId);
              if (r) Object.assign(r, patch);
              return { affected: 1 };
            },
          };
        }
        if (t.name === 'RiderApplication') {
          return {
            findOne: async ({ where }: { where: Partial<RiderApplication> }) =>
              applications.find((a) => a.applicationId === where.applicationId) ?? null,
          };
        }
        if (t.name === 'RiderStatus') {
          return {
            findOne: async ({ where }: { where: Partial<RiderStatus> }) =>
              statuses.find((s) => s.riderId === where.riderId) ?? null,
            insert: async (s: Partial<RiderStatus>) => {
              statuses.push({ ...s, statusId: String(statuses.length + 1) } as RiderStatus);
              return { identifiers: [] };
            },
          };
        }
        if (t.name === 'RiderServiceArea') {
          return {
            findOne: async ({ where }: { where: Partial<RiderServiceArea> }) =>
              areas.find((a) => a.riderId === where.riderId) ?? null,
            insert: async (a: Partial<RiderServiceArea>) => {
              areas.push({ ...a, serviceAreaId: String(areas.length + 1) } as RiderServiceArea);
              return { identifiers: [] };
            },
          };
        }
        return {};
      },
    } as unknown as EntityManager;

    const dataSource = {
      transaction: async (cb: (em: EntityManager) => Promise<unknown>) => cb(em),
    } as unknown as DataSource;

    sub = new RiderApprovedSubscriber(dataSource);
  });

  it('approved 事件 → 写权威字段 + 建 rider_status + rider_service_area', async () => {
    await sub.handle({
      applicationId: '1',
      riderId: '1',
      approvedAt: Date.now(),
      auditedBy: 'admin-1',
    });
    expect(riders[0]!.realName).toBe('骑手张三');
    expect(riders[0]!.idCardNo).toBe('110101199001011234');
    expect(riders[0]!.approvedAt).not.toBeNull();
    expect(riders[0]!.approvedApplicationId).toBe('1');
    expect(statuses).toHaveLength(1);
    expect(statuses[0]!.onlineStatus).toBe('offline');
    expect(areas).toHaveLength(1);
    expect(areas[0]!.geometry.type).toBe('Polygon');
  });

  it('幂等:已 approved → 跳过', async () => {
    riders[0]!.approvedAt = '1700000000000';
    await sub.handle({
      applicationId: '1',
      riderId: '1',
      approvedAt: Date.now(),
      auditedBy: 'admin-1',
    });
    expect(statuses).toHaveLength(0);
    expect(areas).toHaveLength(0);
  });

  it('rider 不存在 → throw', async () => {
    await expect(
      sub.handle({ applicationId: '1', riderId: '999', approvedAt: 0, auditedBy: 'admin-1' }),
    ).rejects.toThrow(/not found/);
  });
});
