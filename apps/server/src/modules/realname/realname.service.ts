import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { CustomerUser, IntegrationRequestLog, RealnameRecord } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';
import { SmsService } from '../sms/sms.service';

import { RealnameVerifyDto, RealnameVerifyVo } from './realname.dto';

@Injectable()
export class RealnameService {
  private readonly logger = new Logger(RealnameService.name);

  constructor(
    @InjectRepository(CustomerUser) private readonly userRepo: Repository<CustomerUser>,
    @InjectRepository(RealnameRecord) private readonly recordRepo: Repository<RealnameRecord>,
    @InjectRepository(IntegrationRequestLog) private readonly logRepo: Repository<IntegrationRequestLog>,
    private readonly smsService: SmsService,
    private readonly gateway: IntegrationGatewayService,
    private readonly eventBus: DomainEventBus,
  ) {}

  async submit(userId: string, dto: RealnameVerifyDto): Promise<RealnameVerifyVo> {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('user not found');

    if (user.realnameStatus === 'verified') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '当前账号已实名,无需重复提交',
      });
    }

    const ok = await this.smsService.verifyCode(user.mobile, 'realname', dto.smsCode);
    if (!ok) {
      throw new UnauthorizedException('验证码错误或已过期');
    }
    await this.smsService.consumeCode(user.mobile, 'realname', dto.smsCode);

    const now = String(Date.now());
    const record = await this.recordRepo.save(
      this.recordRepo.create({
        userId,
        realName: dto.realName,
        idCardNo: dto.idCardNo,
        status: 'pending',
        failedReason: null,
        providerRequestId: null,
        verifiedAt: null,
        createdAt: now,
        updatedAt: now,
      }),
    );

    // 同步置 customer_user.realname_status=pending
    await this.userRepo.update({ userId }, { realnameStatus: 'pending', updatedAt: String(Date.now()) });

    let verifyResult: { success: boolean; providerRequestId: string; reason?: string };
    try {
      verifyResult = await this.gateway.realname.verify(dto.realName, dto.idCardNo);
      await this.writeLog(
        'ali-realname',
        verifyResult.providerRequestId,
        'realname.verify',
        {
          realName: dto.realName,
          idCardNo: dto.idCardNo,
        },
        verifyResult,
        'success',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn({ err, userId }, `[realname] provider failed: ${message}`);
      verifyResult = { success: false, providerRequestId: `failed-${Date.now()}`, reason: '三方不可用' };
      await this.writeLog(
        'ali-realname',
        verifyResult.providerRequestId,
        'realname.verify',
        {
          realName: dto.realName,
          idCardNo: dto.idCardNo,
        },
        { error: message },
        'failed',
      );
    }

    if (verifyResult.success) {
      const verifiedAt = Date.now();
      await this.recordRepo.update(
        { recordId: record.recordId },
        {
          status: 'success',
          providerRequestId: verifyResult.providerRequestId,
          verifiedAt: String(verifiedAt),
          updatedAt: String(verifiedAt),
        },
      );
      await this.userRepo.update({ userId }, { realnameStatus: 'verified', updatedAt: String(verifiedAt) });
      await this.eventBus.publish(
        EventName.CustomerRealnameVerified,
        { userId, verifiedAt },
        { bizType: 'customer-realname', bizId: record.recordId },
      );
      return { verifyStatus: 'success', verifiedAt };
    }

    await this.recordRepo.update(
      { recordId: record.recordId },
      {
        status: 'failed',
        providerRequestId: verifyResult.providerRequestId,
        failedReason: verifyResult.reason ?? '内容不符',
        updatedAt: String(Date.now()),
      },
    );
    await this.userRepo.update({ userId }, { realnameStatus: 'failed', updatedAt: String(Date.now()) });
    return { verifyStatus: 'failed', failedReason: verifyResult.reason ?? '内容不符' };
  }

  async listRecordsByUser(
    userId: string,
    pageNo = 1,
    pageSize = 20,
  ): Promise<{ list: RealnameRecord[]; total: number }> {
    const [list, total] = await this.recordRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    return { list, total };
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
      this.logger.warn({ err }, `[realname] integration log write failed`);
    }
  }
}
