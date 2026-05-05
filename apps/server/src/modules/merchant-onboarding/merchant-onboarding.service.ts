import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { DataSource, EntityManager, Repository } from 'typeorm';

import {
  FileObject,
  IntegrationRequestLog,
  MerchantAccount,
  MerchantApplication,
  type MerchantAuditStatus,
  MerchantLicense,
  type MerchantLicenseType,
} from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';
import { SmsService } from '../sms/sms.service';

import { SubmitApplicationDto, SubmitApplicationVo } from './merchant-onboarding.dto';

@Injectable()
export class MerchantOnboardingService {
  private readonly logger = new Logger(MerchantOnboardingService.name);

  constructor(
    @InjectRepository(MerchantAccount) private readonly merchantRepo: Repository<MerchantAccount>,
    @InjectRepository(MerchantApplication) private readonly appRepo: Repository<MerchantApplication>,
    @InjectRepository(MerchantLicense) private readonly licenseRepo: Repository<MerchantLicense>,
    @InjectRepository(FileObject) private readonly fileRepo: Repository<FileObject>,
    @InjectRepository(IntegrationRequestLog) private readonly logRepo: Repository<IntegrationRequestLog>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly smsService: SmsService,
    private readonly gateway: IntegrationGatewayService,
    private readonly eventBus: DomainEventBus,
  ) {}

  async submit(dto: SubmitApplicationDto): Promise<SubmitApplicationVo> {
    const ok = await this.smsService.verifyCode(dto.mobile, 'login', dto.smsCode);
    if (!ok) {
      throw new UnauthorizedException('验证码错误或已过期');
    }
    await this.smsService.consumeCode(dto.mobile, 'login', dto.smsCode);

    // 校验所有文件 fileId 存在
    const allFileIds = [
      dto.licenseFileId,
      ...(dto.foodPermitFileId ? [dto.foodPermitFileId] : []),
      dto.idCardFrontFileId,
      dto.idCardBackFileId,
      ...dto.storePhotoFileIds,
    ];
    const files = await this.fileRepo.find({ where: allFileIds.map((fid) => ({ fileId: fid })) });
    if (files.length !== allFileIds.length) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '部分资质文件未找到',
      });
    }

    // 重提规则:已 pending 的不可重复提交
    const existing = await this.merchantRepo.findOne({ where: { mobile: dto.mobile } });
    if (existing) {
      const latest = existing.latestApplicationId
        ? await this.appRepo.findOne({ where: { applicationId: existing.latestApplicationId } })
        : null;
      if (latest && latest.auditStatus === 'pending') {
        throw new UnprocessableEntityException({
          code: ErrorCode.DUPLICATE_REQUEST,
          message: '已有待审核申请,请耐心等待',
        });
      }
      if (existing.accountStatus === 'disabled') {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          message: '账号已被禁用,请联系平台',
        });
      }
    }

    const result = await this.dataSource.transaction(async (em: EntityManager) => {
      const merchantRepo = em.getRepository(MerchantAccount);
      const appRepo = em.getRepository(MerchantApplication);
      const licenseRepo = em.getRepository(MerchantLicense);
      const now = String(Date.now());

      // 1. 商家账号(首次创建 pending,已存在则复用)
      let merchant: MerchantAccount;
      if (!existing) {
        merchant = await merchantRepo.save(
          merchantRepo.create({
            mobile: dto.mobile,
            accountStatus: 'pending',
            latestApplicationId: null,
            approvedStoreId: null,
            createdAt: now,
            updatedAt: now,
          }),
        );
      } else {
        merchant = existing;
      }

      // 2. 申请记录
      const app = await appRepo.save(
        appRepo.create({
          merchantId: merchant.merchantId,
          auditStatus: 'pending' as MerchantAuditStatus,
          storeName: dto.storeName,
          businessScope: dto.businessScope,
          legalPerson: dto.legalPerson,
          idCardNo: dto.idCardNo,
          licenseNo: dto.licenseNo,
          foodPermitNo: dto.foodPermitNo ?? null,
          commissionRate: null,
          rejectReason: null,
          submittedAt: now,
          auditedAt: null,
          auditedBy: null,
          createdAt: now,
          updatedAt: now,
        }),
      );

      // 3. 资质文件关联(N 行)
      const licenses: Array<{ type: MerchantLicenseType; fileId: string }> = [
        { type: 'business_license', fileId: dto.licenseFileId },
        ...(dto.foodPermitFileId ? [{ type: 'food_permit' as MerchantLicenseType, fileId: dto.foodPermitFileId }] : []),
        { type: 'legal_id_card_front', fileId: dto.idCardFrontFileId },
        { type: 'legal_id_card_back', fileId: dto.idCardBackFileId },
        ...dto.storePhotoFileIds.map((fileId) => ({ type: 'store_photo' as MerchantLicenseType, fileId })),
      ];
      for (const l of licenses) {
        await licenseRepo.insert({
          applicationId: app.applicationId,
          licenseType: l.type,
          fileId: l.fileId,
          expiryDate: null,
          createdAt: now,
        });
      }

      // 4. 更新商家最近申请 ID
      await merchantRepo.update(
        { merchantId: merchant.merchantId },
        { latestApplicationId: app.applicationId, updatedAt: now },
      );

      return { merchant, app };
    });

    // 5. 异步:第三方 mock 校验(不阻塞主流程)
    void this.tryVerifyEnterprise(result.app.applicationId, {
      licenseNo: dto.licenseNo,
      legalName: dto.legalPerson,
      legalIdCardNo: dto.idCardNo,
      foodPermitNo: dto.foodPermitNo,
    });

    // 6. 发布事件
    await this.eventBus.publish(
      EventName.MerchantSubmitted,
      {
        merchantId: result.merchant.merchantId,
        applicationId: result.app.applicationId,
        submittedAt: Number(result.app.submittedAt),
      },
      { bizType: 'merchant', bizId: result.merchant.merchantId },
    );

    return {
      applicationId: result.app.applicationId,
      auditStatus: result.app.auditStatus,
      submittedAt: Number(result.app.submittedAt),
    };
  }

  async getStatus(merchantId: string): Promise<{
    auditStatus: string;
    rejectReason: string | null;
    canResubmit: boolean;
    lastSubmittedAt: string | null;
    storeName: string | null;
    legalPerson: string | null;
  }> {
    const merchant = await this.merchantRepo.findOne({ where: { merchantId } });
    if (!merchant) {
      throw new NotFoundException('merchant not found');
    }
    const latest = merchant.latestApplicationId
      ? await this.appRepo.findOne({ where: { applicationId: merchant.latestApplicationId } })
      : null;
    if (!latest) {
      return {
        auditStatus: 'pending',
        rejectReason: null,
        canResubmit: true,
        lastSubmittedAt: null,
        storeName: null,
        legalPerson: null,
      };
    }
    return {
      auditStatus: latest.auditStatus,
      rejectReason: latest.rejectReason,
      canResubmit: latest.auditStatus === 'rejected',
      lastSubmittedAt: latest.submittedAt,
      storeName: latest.storeName,
      legalPerson: latest.legalPerson,
    };
  }

  private async tryVerifyEnterprise(
    applicationId: string,
    opts: { licenseNo: string; legalName: string; legalIdCardNo: string; foodPermitNo?: string },
  ): Promise<void> {
    const requestId = `enterprise-${applicationId}-${Date.now()}`;
    try {
      const r = await this.gateway.realname.verifyEnterprise(opts);
      await this.writeLog('ali-realname', r.providerRequestId, 'realname.verifyEnterprise', opts, r, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn({ err }, `[onboarding] verifyEnterprise failed: ${message}`);
      await this.writeLog('ali-realname', requestId, 'realname.verifyEnterprise', opts, { error: message }, 'failed');
    }
  }

  private async writeLog(
    provider: string,
    requestId: string,
    endpoint: string,
    requestPayload: unknown,
    responsePayload: unknown,
    status: 'success' | 'failed',
  ): Promise<void> {
    const now = String(Date.now());
    try {
      await this.logRepo.insert({
        provider,
        requestId,
        endpoint,
        requestPayload: JSON.stringify(requestPayload),
        responsePayload: JSON.stringify(responsePayload),
        status,
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      this.logger.warn({ err }, `[onboarding] integration log write failed`);
    }
  }
}
