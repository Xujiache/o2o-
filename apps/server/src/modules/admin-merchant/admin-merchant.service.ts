import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Brackets, DataSource, Repository } from 'typeorm';

import {
  FileObject,
  MerchantAccount,
  MerchantApplication,
  type MerchantAuditStatus,
  MerchantLicense,
  Store,
  type StoreBusinessStatus,
} from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { StoreService } from '../store/store.service';

import {
  ApplicationDetailVo,
  ApplicationListItemVo,
  ApplicationListPageVo,
  AuditDto,
  AuditVo,
  ForceStatusDto,
  LicenseFileVo,
  ListApplicationsQueryDto,
  ListStoresQueryDto,
  StoreItemVo,
} from './admin-merchant.dto';

@Injectable()
export class AdminMerchantService {
  constructor(
    @InjectRepository(MerchantApplication) private readonly appRepo: Repository<MerchantApplication>,
    @InjectRepository(MerchantAccount) private readonly merchantRepo: Repository<MerchantAccount>,
    @InjectRepository(MerchantLicense) private readonly licenseRepo: Repository<MerchantLicense>,
    @InjectRepository(FileObject) private readonly fileRepo: Repository<FileObject>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storeService: StoreService,
    private readonly eventBus: DomainEventBus,
  ) {}

  async listApplications(query: ListApplicationsQueryDto): Promise<ApplicationListPageVo> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.appRepo.createQueryBuilder('a');
    if (query.auditStatus) qb.andWhere('a.audit_status = :s', { s: query.auditStatus });
    if (query.keyword) {
      const kw = query.keyword.trim();
      qb.andWhere(
        new Brackets((sub) =>
          sub
            .where('a.store_name LIKE :kw', { kw: `%${kw}%` })
            .orWhere('a.legal_person LIKE :kw', { kw: `%${kw}%` })
            .orWhere('a.merchant_id = :mid', { mid: kw }),
        ),
      );
    }
    qb.orderBy('a.submitted_at', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    const list = rows.map((a) =>
      plainToInstance(
        ApplicationListItemVo,
        {
          applicationId: a.applicationId,
          merchantId: a.merchantId,
          storeName: a.storeName,
          legalPersonMasked: a.legalPerson,
          licenseNoMasked: a.licenseNo,
          auditStatus: a.auditStatus,
          submittedAt: a.submittedAt,
        },
        { excludeExtraneousValues: true },
      ),
    );
    return { pageNo, pageSize, total, list };
  }

  async getApplicationDetail(applicationId: string): Promise<ApplicationDetailVo> {
    const app = await this.appRepo.findOne({ where: { applicationId } });
    if (!app) throw new NotFoundException('application not found');
    const merchant = await this.merchantRepo.findOne({ where: { merchantId: app.merchantId } });
    const licenses = await this.licenseRepo.find({ where: { applicationId } });

    const fileIds = licenses.map((l) => l.fileId);
    const files = fileIds.length ? await this.fileRepo.find({ where: fileIds.map((fid) => ({ fileId: fid })) }) : [];
    const fileMap = new Map(files.map((f) => [f.fileId, f.url]));

    const licenseList: LicenseFileVo[] = licenses.map((l) => ({
      licenseType: l.licenseType,
      fileId: l.fileId,
      url: fileMap.get(l.fileId) ?? null,
    }));

    return plainToInstance(
      ApplicationDetailVo,
      {
        applicationId: app.applicationId,
        merchantId: app.merchantId,
        mobileMasked: merchant?.mobile ?? '',
        storeName: app.storeName,
        businessScope: app.businessScope,
        legalPersonMasked: app.legalPerson,
        idCardMasked: app.idCardNo,
        licenseNoMasked: app.licenseNo,
        foodPermitNoMasked: app.foodPermitNo ?? undefined,
        auditStatus: app.auditStatus,
        rejectReason: app.rejectReason,
        commissionRate: app.commissionRate,
        licenses: licenseList,
        submittedAt: app.submittedAt,
      },
      { excludeExtraneousValues: true },
    );
  }

  async audit(applicationId: string, operatorId: string, dto: AuditDto): Promise<AuditVo> {
    const app = await this.appRepo.findOne({ where: { applicationId } });
    if (!app) throw new NotFoundException('application not found');

    // 幂等:已是目标态 → 不重发事件
    if (app.auditStatus === dto.auditResult) {
      const existingMerchant = await this.merchantRepo.findOne({ where: { merchantId: app.merchantId } });
      return {
        merchantId: app.merchantId,
        storeId: existingMerchant?.approvedStoreId ?? null,
        auditStatus: app.auditStatus,
      };
    }

    const now = String(Date.now());
    const targetStatus = dto.auditResult as MerchantAuditStatus;
    const patch: Partial<MerchantApplication> = {
      auditStatus: targetStatus,
      auditedAt: now,
      auditedBy: operatorId,
      updatedAt: now,
    };
    if (dto.auditResult === 'approved') {
      patch.commissionRate = String(dto.commissionRate ?? 0.05);
    } else if (dto.auditResult === 'rejected') {
      patch.rejectReason = dto.rejectReason ?? '资质不符';
    }

    await this.appRepo.update({ applicationId }, patch);
    if (dto.auditResult === 'approved') {
      await this.merchantRepo.update({ merchantId: app.merchantId }, { accountStatus: 'active', updatedAt: now });
      await this.eventBus.publish(
        EventName.MerchantApproved,
        {
          merchantId: app.merchantId,
          applicationId: app.applicationId,
          commissionRate: dto.commissionRate ?? 0.05,
          approvedAt: Number(now),
          auditedBy: operatorId,
        },
        { bizType: 'merchant', bizId: app.merchantId },
      );
    }

    const merchant = await this.merchantRepo.findOne({ where: { merchantId: app.merchantId } });
    return {
      merchantId: app.merchantId,
      storeId: merchant?.approvedStoreId ?? null,
      auditStatus: targetStatus,
    };
  }

  async listStores(query: ListStoresQueryDto): Promise<{
    pageNo: number;
    pageSize: number;
    total: number;
    list: StoreItemVo[];
  }> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.storeRepo.createQueryBuilder('s');
    if (query.businessStatus) qb.andWhere('s.business_status = :st', { st: query.businessStatus });
    qb.orderBy('s.created_at', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    const list = rows.map((s) =>
      plainToInstance(
        StoreItemVo,
        {
          storeId: s.storeId,
          merchantId: s.merchantId,
          name: s.name,
          businessStatus: s.businessStatus,
          commissionRate: s.commissionRate,
        },
        { excludeExtraneousValues: true },
      ),
    );
    return { pageNo, pageSize, total, list };
  }

  async forceBusinessStatus(
    storeId: string,
    operatorId: string,
    dto: ForceStatusDto,
  ): Promise<{ storeId: string; businessStatus: string }> {
    return this.storeService.forceSetStatus(storeId, dto.businessStatus as StoreBusinessStatus, operatorId, dto.reason);
  }
}
