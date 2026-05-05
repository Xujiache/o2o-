import { NotFoundException } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import type { DataSource, Repository } from 'typeorm';

import type { FileObject, MerchantAccount, MerchantApplication, MerchantLicense, Store } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import type { StoreService } from '../store/store.service';

import { AdminMerchantService } from './admin-merchant.service';

describe('AdminMerchantService', () => {
  let svc: AdminMerchantService;
  let apps: MerchantApplication[];
  let merchants: MerchantAccount[];
  let licenses: MerchantLicense[];
  let files: FileObject[];
  let stores: Store[];
  let publishedEvents: Array<{ name: string; payload: unknown }>;

  let appRepo: jest.Mocked<Repository<MerchantApplication>>;
  let merchantRepo: jest.Mocked<Repository<MerchantAccount>>;
  let licenseRepo: jest.Mocked<Repository<MerchantLicense>>;
  let fileRepo: jest.Mocked<Repository<FileObject>>;
  let storeRepo: jest.Mocked<Repository<Store>>;
  let dataSource: { transaction: jest.Mock };
  let storeService: jest.Mocked<StoreService>;
  let bus: jest.Mocked<DomainEventBus>;

  beforeEach(() => {
    apps = [
      {
        applicationId: '100',
        merchantId: '1',
        auditStatus: 'pending',
        storeName: '小店',
        businessScope: '中餐',
        legalPerson: '张三',
        idCardNo: '110101199001011234',
        licenseNo: '91110000MA001ABCD1',
        foodPermitNo: 'JY11000000000001',
        commissionRate: null,
        rejectReason: null,
        submittedAt: '1700000000000',
        auditedAt: null,
        auditedBy: null,
        createdAt: '0',
        updatedAt: '0',
      } as MerchantApplication,
      {
        applicationId: '101',
        merchantId: '2',
        auditStatus: 'approved',
        storeName: '已通过店',
        businessScope: '便利店',
        legalPerson: '李四',
        idCardNo: '110101199001012345',
        licenseNo: '91110000MA001ABCD2',
        foodPermitNo: null,
        commissionRate: '0.0500',
        rejectReason: null,
        submittedAt: '1700000010000',
        auditedAt: '1700000020000',
        auditedBy: 'admin-1',
        createdAt: '0',
        updatedAt: '0',
      } as MerchantApplication,
    ];
    merchants = [
      { merchantId: '1', mobile: '13800000001', accountStatus: 'pending', approvedStoreId: null } as MerchantAccount,
      { merchantId: '2', mobile: '13800000002', accountStatus: 'active', approvedStoreId: '201' } as MerchantAccount,
    ];
    licenses = [];
    files = [];
    stores = [];
    publishedEvents = [];

    appRepo = {
      createQueryBuilder: jest.fn(() => {
        const qb: Record<string, unknown> = {};
        const chain = () => qb;
        qb.andWhere = jest.fn(chain);
        qb.orderBy = jest.fn(chain);
        qb.skip = jest.fn(chain);
        qb.take = jest.fn(chain);
        qb.getManyAndCount = jest.fn(async () => [apps, apps.length] as [MerchantApplication[], number]);
        return qb;
      }),
      findOne: jest.fn(
        async ({ where }: { where: Partial<MerchantApplication> }) =>
          apps.find((a) => a.applicationId === where.applicationId) ?? null,
      ),
      update: jest.fn(async (criteria: Partial<MerchantApplication>, patch: Partial<MerchantApplication>) => {
        const a = apps.find((x) => x.applicationId === criteria.applicationId);
        if (a) Object.assign(a, patch);
        return { affected: a ? 1 : 0 };
      }),
    } as unknown as jest.Mocked<Repository<MerchantApplication>>;

    merchantRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<MerchantAccount> }) =>
          merchants.find((m) => m.merchantId === where.merchantId) ?? null,
      ),
      update: jest.fn(async (criteria: Partial<MerchantAccount>, patch: Partial<MerchantAccount>) => {
        const m = merchants.find((x) => x.merchantId === criteria.merchantId);
        if (m) Object.assign(m, patch);
        return { affected: m ? 1 : 0 };
      }),
    } as unknown as jest.Mocked<Repository<MerchantAccount>>;

    licenseRepo = {
      find: jest.fn(async () => licenses),
    } as unknown as jest.Mocked<Repository<MerchantLicense>>;

    fileRepo = {
      find: jest.fn(async () => files),
    } as unknown as jest.Mocked<Repository<FileObject>>;

    storeRepo = {
      createQueryBuilder: jest.fn(() => {
        const qb: Record<string, unknown> = {};
        const chain = () => qb;
        qb.andWhere = jest.fn(chain);
        qb.orderBy = jest.fn(chain);
        qb.skip = jest.fn(chain);
        qb.take = jest.fn(chain);
        qb.getManyAndCount = jest.fn(async () => [stores, stores.length] as [Store[], number]);
        return qb;
      }),
    } as unknown as jest.Mocked<Repository<Store>>;

    dataSource = { transaction: jest.fn() };

    storeService = {
      forceSetStatus: jest.fn(async (storeId: string, targetStatus: string) => ({
        storeId,
        businessStatus: targetStatus,
      })),
    } as unknown as jest.Mocked<StoreService>;

    bus = {
      publish: jest.fn(async (name: string, payload: unknown) => {
        publishedEvents.push({ name, payload });
        return { eventId: 'evt' };
      }),
    } as unknown as jest.Mocked<DomainEventBus>;

    svc = new AdminMerchantService(
      appRepo,
      merchantRepo,
      licenseRepo,
      fileRepo,
      storeRepo,
      dataSource as unknown as DataSource,
      storeService,
      bus,
    );
  });

  it('listApplications:返回带脱敏字段的列表', async () => {
    const r = await svc.listApplications({});
    expect(r.total).toBe(2);
    const serialized = instanceToPlain(r.list[0]!) as { legalPersonMasked: string };
    expect(serialized.legalPersonMasked).toBeTruthy();
  });

  it('getApplicationDetail:返回详情 + 资质文件 url', async () => {
    licenses.push({
      licenseId: 'l1',
      applicationId: '100',
      licenseType: 'business_license',
      fileId: 'f1',
      expiryDate: null,
      createdAt: '0',
    } as MerchantLicense);
    files.push({ fileId: 'f1', url: 'http://minio/file-1' } as FileObject);
    const detail = await svc.getApplicationDetail('100');
    expect(detail.applicationId).toBe('100');
    expect(detail.licenses).toHaveLength(1);
    expect(detail.licenses[0]!.url).toBe('http://minio/file-1');
  });

  it('getApplicationDetail 不存在 → NotFound', async () => {
    await expect(svc.getApplicationDetail('999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('audit approved:UPDATE app + merchant active + 发 MerchantApproved + 发 MerchantAudited(stage 4 通用事件)', async () => {
    const r = await svc.audit('100', 'admin-1', { auditResult: 'approved', commissionRate: 0.07 });
    expect(r.auditStatus).toBe('approved');
    expect(apps[0]!.commissionRate).toBe('0.07');
    expect(merchants[0]!.accountStatus).toBe('active');
    expect(publishedEvents).toEqual([
      expect.objectContaining({
        name: EventName.MerchantApproved,
        payload: expect.objectContaining({ merchantId: '1', commissionRate: 0.07 }),
      }),
      expect.objectContaining({
        name: EventName.MerchantAudited,
        payload: expect.objectContaining({ merchantId: '1', auditResult: 'approved', operatorAdminId: 'admin-1' }),
      }),
    ]);
  });

  it('audit rejected:UPDATE rejectReason + 发 MerchantAudited(stage 4)不发 MerchantApproved', async () => {
    const r = await svc.audit('100', 'admin-1', { auditResult: 'rejected', rejectReason: '资质不符' });
    expect(r.auditStatus).toBe('rejected');
    expect(apps[0]!.rejectReason).toBe('资质不符');
    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0]).toEqual(
      expect.objectContaining({
        name: EventName.MerchantAudited,
        payload: expect.objectContaining({ auditResult: 'rejected', rejectReason: '资质不符' }),
      }),
    );
    expect(publishedEvents.find((e) => e.name === EventName.MerchantApproved)).toBeUndefined();
  });

  it('audit 幂等:已 approved 再次 audit approved → 不重发事件', async () => {
    const r = await svc.audit('101', 'admin-1', { auditResult: 'approved', commissionRate: 0.05 });
    expect(r.auditStatus).toBe('approved');
    expect(publishedEvents).toHaveLength(0);
  });

  it('forceBusinessStatus 委托给 storeService', async () => {
    await svc.forceBusinessStatus('201', 'admin-1', { businessStatus: 'paused', reason: '违规' });
    expect(storeService.forceSetStatus).toHaveBeenCalledWith('201', 'paused', 'admin-1', '违规');
  });
});
