import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import type Redis from 'ioredis';
import { Repository } from 'typeorm';

import { REDIS_CLIENT } from '../../config/redis.module';
import { IntegrationRequestLog, SmsCode } from '../../database/entities';
import { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';

import {
  RATE_IP_PER_MINUTE,
  RATE_KEY,
  RATE_MOBILE_PER_DAY,
  RATE_MOBILE_PER_MINUTE,
  SMS_CODE_LENGTH,
  SMS_CODE_TTL_SECONDS,
  type SmsScene,
} from './sms.constants';

export interface SendCodeResult {
  sendResult: boolean;
  expireSeconds: number;
  requestId: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @InjectRepository(SmsCode) private readonly smsRepo: Repository<SmsCode>,
    @InjectRepository(IntegrationRequestLog) private readonly logRepo: Repository<IntegrationRequestLog>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  /**
   * 发送验证码:限频检查 → 生成 6 位码 → INSERT sms_code → 调 ali-sms 适配器 → 写 integration_request_log。
   * 限频违规抛 RATE_LIMIT_EXCEEDED;第三方失败抛 THIRD_PARTY_ERROR。
   */
  async sendCode(mobile: string, scene: SmsScene, ip: string | null): Promise<SendCodeResult> {
    await this.checkRateLimit(mobile, ip);

    const code = this.generateCode();
    const now = Date.now();
    const expireAt = now + SMS_CODE_TTL_SECONDS * 1000;

    const record = this.smsRepo.create({
      mobile,
      scene,
      code,
      expireAt: String(expireAt),
      clientIp: ip,
      createdAt: String(now),
    });
    await this.smsRepo.save(record);

    const sendStartedAt = Date.now();
    let providerRequestId = '';
    try {
      const r = await this.gateway.sms.send(mobile, scene, code, SMS_CODE_TTL_SECONDS / 60);
      providerRequestId = r.providerRequestId;
      await this.writeIntegrationLog('ali-sms', providerRequestId, 'sms.send', { mobile, scene }, r, 'success');
      return { sendResult: r.success, expireSeconds: SMS_CODE_TTL_SECONDS, requestId: providerRequestId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.writeIntegrationLog(
        'ali-sms',
        `failed-${now}-${Math.random().toString(36).slice(2, 8)}`,
        'sms.send',
        { mobile, scene },
        { error: message, durationMs: Date.now() - sendStartedAt },
        'failed',
      );
      this.logger.warn({ err, mobile: this.maskMobile(mobile) }, `[sms] provider failed: ${message}`);
      throw new HttpException(
        { code: ErrorCode.THIRD_PARTY_ERROR, message: '短信服务暂不可用,请稍后重试' },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * 校验验证码:返回 true 不消费;留 consumeCode 给上游业务在校验通过后原子消费。
   */
  async verifyCode(mobile: string, scene: SmsScene, code: string): Promise<boolean> {
    if (!code || !/^\d{6}$/.test(code)) return false;
    const now = Date.now();
    const row = await this.smsRepo
      .createQueryBuilder('s')
      .where('s.mobile = :mobile', { mobile })
      .andWhere('s.scene = :scene', { scene })
      .andWhere('s.code = :code', { code })
      .andWhere('s.usedAt IS NULL')
      .andWhere('CAST(s.expireAt AS UNSIGNED) > :now', { now })
      .orderBy('s.createdAt', 'DESC')
      .getOne();
    return !!row;
  }

  /** 消费验证码:UPDATE used_at(原子,带 used_at IS NULL 防重放) */
  async consumeCode(mobile: string, scene: SmsScene, code: string): Promise<boolean> {
    const now = Date.now();
    const r = await this.smsRepo
      .createQueryBuilder()
      .update(SmsCode)
      .set({ usedAt: String(now) })
      .where('mobile = :mobile', { mobile })
      .andWhere('scene = :scene', { scene })
      .andWhere('code = :code', { code })
      .andWhere('used_at IS NULL')
      .andWhere('CAST(expire_at AS UNSIGNED) > :now', { now })
      .execute();
    return (r.affected ?? 0) > 0;
  }

  private async checkRateLimit(mobile: string, ip: string | null): Promise<void> {
    // 同手机号 60s 1 次
    const mobileKey = RATE_KEY.mobilePerMinute(mobile);
    const mobileSet = await this.redis.set(mobileKey, '1', 'EX', RATE_MOBILE_PER_MINUTE.window, 'NX');
    if (mobileSet !== 'OK') {
      throw new HttpException(
        { code: ErrorCode.RATE_LIMIT_EXCEEDED, message: '验证码请求过于频繁,请 60 秒后再试' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 同 IP 60s 5 次
    if (ip) {
      const ipKey = RATE_KEY.ipPerMinute(ip);
      const ipCount = await this.redis.incr(ipKey);
      if (ipCount === 1) await this.redis.expire(ipKey, RATE_IP_PER_MINUTE.window);
      if (ipCount > RATE_IP_PER_MINUTE.max) {
        // 回滚 mobile/60s 占位以免误锁
        await this.redis.del(mobileKey).catch(() => undefined);
        throw new HttpException(
          { code: ErrorCode.RATE_LIMIT_EXCEEDED, message: '当前 IP 短信发送过于频繁' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // 同手机号 24h 10 次
    const dayKey = RATE_KEY.mobilePerDay(mobile);
    const dayCount = await this.redis.incr(dayKey);
    if (dayCount === 1) await this.redis.expire(dayKey, RATE_MOBILE_PER_DAY.window);
    if (dayCount > RATE_MOBILE_PER_DAY.max) {
      await this.redis.del(mobileKey).catch(() => undefined);
      throw new HttpException(
        { code: ErrorCode.RATE_LIMIT_EXCEEDED, message: '该手机号当日短信次数已达上限' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private generateCode(): string {
    // mock 模式恒为 123456,便于客户预览(stage 11 切真支付/真 sms 时此分支自动失效)
    if (process.env.INTEGRATION_MODE === 'mock') return '123456';
    let s = '';
    for (let i = 0; i < SMS_CODE_LENGTH; i++) s += Math.floor(Math.random() * 10);
    return s;
  }

  private maskMobile(m: string): string {
    return m.length === 11 ? `${m.slice(0, 3)}****${m.slice(-4)}` : '***';
  }

  private async writeIntegrationLog(
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
      // 日志失败不影响主流程
      this.logger.warn({ err }, `[sms] integration log write failed`);
    }
  }
}
