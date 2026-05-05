import { UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type {
  FileObject,
  IntegrationRequestLog,
  MerchantAccount,
  MerchantApplication,
  MerchantLicense,
} from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import type { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';
import type { SmsService } from '../sms/sms.service';

import { MerchantOnboardingService } from './merchant-onboarding.service';

describe('MerchantOnboardingService', () => {
  let svc: MerchantOnboardingService;
  let merchants: MerchantAccount[];
  let apps: MerchantApplication[];
  let licenses: MerchantLicense[];
  let publishedEvents: Array<{ name: string; payload: unknown }>;
  let nextMerchantId = 1;
  let nextAppId = 100;

  let merchantRepo: jest.Mocked<Repository<MerchantAccount>>;
  let appRepo: jest.Mocked<Repository<MerchantApplication>>;
  let licenseRepo: jest.Mocked<Repository<MerchantLicense>>;
  let fileRepo: jest.Mocked<Repository<FileObject>>;
  let logRepo: jest.Mocked<Repository<IntegrationRequestLog>>;
  let dataSource: { transaction: jest.Mock };
  let sms: jest.Mocked<SmsService>;
  let gateway: { realname: { verifyEnterprise: jest.Mock } };
  let bus: jest.Mocked<DomainEventBus>;

  const validDto = {
    mobile: '13800000001',
    smsCode: '123456',
    licenseFileId: 'file-license-001',
    foodPermitFileId: 'file-food-001',
    idCardFrontFileId: 'file-id-front-001',
    idCardBackFileId: 'file-id-back-001',
    storePhotoFileIds: ['file-store-001'],
    legalPerson: '张三',
    idCardNo: '110101199001011234',
    licenseNo: '91110000MA001ABCD1',
    foodPermitNo: 'JY11000000000001',
    storeName: '张三家烧烤',
    businessScope: '中餐',
  };

  beforeEach(() => {
    merchants = [];
    apps = [];
    licenses = [];
    publishedEvents = [];
    nextMerchantId = 1;
    nextAppId = 100;

    merchantRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<MerchantAccount> }) =>
          merchants.find(
            (m) =>
              (where.mobile ? m.mobile === where.mobile : true) &&
              (where.merchantId ? m.merchantId === where.merchantId : true),
          ) ?? null,
      ),
    } as unknown as jest.Mocked<Repository<MerchantAccount>>;

    appRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<MerchantApplication> }) =>
          apps.find((a) => a.applicationId === where.applicationId) ?? null,
      ),
    } as unknown as jest.Mocked<Repository<MerchantApplication>>;

    licenseRepo = {} as never;

    fileRepo = {
      find: jest.fn(async ({ where }: { where: Array<{ fileId: string }> }) =>
        where.map((w) => ({ fileId: w.fileId, ownerType: 'merchant', ownerId: '1' }) as FileObject),
      ),
    } as unknown as jest.Mocked<Repository<FileObject>>;

    logRepo = {
      insert: jest.fn(async () => ({ identifiers: [] })),
    } as unknown as jest.Mocked<Repository<IntegrationRequestLog>>;

    const txMerchantRepo = {
      create: (dto: Partial<MerchantAccount>) => dto as MerchantAccount,
      save: async (m: MerchantAccount) => {
        const saved = { ...m, merchantId: String(nextMerchantId++) };
        merchants.push(saved);
        return saved;
      },
      update: async (criteria: Partial<MerchantAccount>, patch: Partial<MerchantAccount>) => {
        const m = merchants.find((x) => x.merchantId === criteria.merchantId);
        if (m) Object.assign(m, patch);
        return { affected: m ? 1 : 0 };
      },
    };
    const txAppRepo = {
      create: (dto: Partial<MerchantApplication>) => dto as MerchantApplication,
      save: async (a: MerchantApplication) => {
        const saved = { ...a, applicationId: String(nextAppId++) };
        apps.push(saved);
        return saved;
      },
    };
    const txLicenseRepo = {
      insert: async (l: Partial<MerchantLicense>) => {
        licenses.push(l as MerchantLicense);
        return { identifiers: [] };
      },
    };

    dataSource = {
      transaction: jest.fn(async (cb: (em: EntityManager) => Promise<unknown>) => {
        const em = {
          getRepository: (target: unknown) => {
            const name = (target as { name?: string }).name;
            if (name === 'MerchantAccount') return txMerchantRepo;
            if (name === 'MerchantApplication') return txAppRepo;
            if (name === 'MerchantLicense') return txLicenseRepo;
            return {} as never;
          },
        } as unknown as EntityManager;
        return cb(em);
      }),
    };

    sms = {
      verifyCode: jest.fn(async () => true),
      consumeCode: jest.fn(async () => true),
    } as unknown as jest.Mocked<SmsService>;

    gateway = {
      realname: {
        verifyEnterprise: jest.fn(async () => ({ success: true, providerRequestId: 'mock-ent-1' })),
      },
    };

    bus = {
      publish: jest.fn(async (name: string, payload: unknown) => {
        publishedEvents.push({ name, payload });
        return { eventId: 'evt' };
      }),
    } as unknown as jest.Mocked<DomainEventBus>;

    svc = new MerchantOnboardingService(
      merchantRepo,
      appRepo,
      licenseRepo,
      fileRepo,
      logRepo,
      dataSource as unknown as DataSource,
      sms,
      gateway as unknown as IntegrationGatewayService,
      bus,
    );
  });

  it('首次提交:建 merchant + application + 5 资质行 + 发 MerchantSubmitted', async () => {
    const r = await svc.submit(validDto);
    expect(r.applicationId).toBe('100');
    expect(r.auditStatus).toBe('pending');
    expect(merchants).toHaveLength(1);
    expect(apps).toHaveLength(1);
    expect(licenses).toHaveLength(5); // license + food + id-front + id-back + 1 store-photo
    expect(publishedEvents).toEqual([expect.objectContaining({ name: EventName.MerchantSubmitted })]);
    // 异步 verifyEnterprise 已调
    expect(gateway.realname.verifyEnterprise).toHaveBeenCalled();
  });

  it('sms code 错 → UnauthorizedException;不写表', async () => {
    sms.verifyCode.mockResolvedValueOnce(false);
    await expect(svc.submit(validDto)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(merchants).toHaveLength(0);
    expect(apps).toHaveLength(0);
  });

  it('部分文件不存在 → STATUS_INVALID', async () => {
    fileRepo.find.mockResolvedValueOnce([{ fileId: 'one' } as FileObject]);
    await expect(svc.submit(validDto)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('已 pending 重复提交 → DUPLICATE_REQUEST', async () => {
    merchants.push({
      merchantId: '5',
      mobile: validDto.mobile,
      accountStatus: 'pending',
      latestApplicationId: '500',
      approvedStoreId: null,
      createdAt: '0',
      updatedAt: '0',
    } as MerchantAccount);
    apps.push({ applicationId: '500', auditStatus: 'pending' } as MerchantApplication);
    await expect(svc.submit(validDto)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('已 rejected 可重提:复用 merchant + 新建 application', async () => {
    merchants.push({
      merchantId: '6',
      mobile: validDto.mobile,
      accountStatus: 'pending',
      latestApplicationId: '600',
      approvedStoreId: null,
      createdAt: '0',
      updatedAt: '0',
    } as MerchantAccount);
    apps.push({ applicationId: '600', auditStatus: 'rejected' } as MerchantApplication);

    const r = await svc.submit(validDto);
    expect(r.applicationId).toBe('100'); // 新 application
    expect(merchants).toHaveLength(1); // 不再新建
  });

  it('disabled 商家不可重提', async () => {
    merchants.push({
      merchantId: '7',
      mobile: validDto.mobile,
      accountStatus: 'disabled',
      latestApplicationId: null,
      approvedStoreId: null,
      createdAt: '0',
      updatedAt: '0',
    } as MerchantAccount);
    await expect(svc.submit(validDto)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('getStatus:无申请历史 → 默认可重提', async () => {
    merchants.push({
      merchantId: '10',
      mobile: '13800001234',
      accountStatus: 'pending',
      latestApplicationId: null,
      approvedStoreId: null,
      createdAt: '0',
      updatedAt: '0',
    } as MerchantAccount);
    const r = await svc.getStatus('10');
    expect(r.canResubmit).toBe(true);
    expect(r.auditStatus).toBe('pending');
  });

  it('getStatus:rejected → canResubmit=true', async () => {
    merchants.push({
      merchantId: '11',
      mobile: '13800001235',
      accountStatus: 'pending',
      latestApplicationId: '900',
      approvedStoreId: null,
      createdAt: '0',
      updatedAt: '0',
    } as MerchantAccount);
    apps.push({
      applicationId: '900',
      auditStatus: 'rejected',
      rejectReason: '资质不全',
      submittedAt: '1700000000000',
      storeName: '小店',
      legalPerson: '李四',
    } as MerchantApplication);
    const r = await svc.getStatus('11');
    expect(r.canResubmit).toBe(true);
    expect(r.auditStatus).toBe('rejected');
    expect(r.rejectReason).toBe('资质不全');
  });
});
