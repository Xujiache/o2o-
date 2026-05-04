import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../config/configuration';

import { type AlipayAdapter, AlipayMockAdapter, AlipayRealAdapter } from './adapters/alipay.adapter';
import { type AmapAdapter, AmapMockAdapter, AmapRealAdapter } from './adapters/amap.adapter';
import { type GetuiAdapter, GetuiMockAdapter, GetuiRealAdapter } from './adapters/getui.adapter';
import { type RealnameAdapter, RealnameMockAdapter, RealnameRealAdapter } from './adapters/realname.adapter';
import { type SmsAdapter, SmsMockAdapter, SmsRealAdapter } from './adapters/sms.adapter';
import { MinioStorageAdapter, MockStorageAdapter, type StorageAdapter } from './adapters/storage.adapter';
import { type WxpayAdapter, WxpayMockAdapter, WxpayRealAdapter } from './adapters/wxpay.adapter';

export const INTEGRATION_GATEWAY = Symbol('INTEGRATION_GATEWAY');

/**
 * 第三方适配统一入口。按 INTEGRATION_MODE 切换 mock/real。
 * Storage 单独看 STORAGE_PROVIDER:dev 默认 minio(本地容器在跑),也支持 in-memory mock。
 */
@Injectable()
export class IntegrationGatewayService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationGatewayService.name);

  readonly storage: StorageAdapter;
  readonly amap: AmapAdapter;
  readonly wxpay: WxpayAdapter;
  readonly alipay: AlipayAdapter;
  readonly getui: GetuiAdapter;
  readonly sms: SmsAdapter;
  readonly realname: RealnameAdapter;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    const mode = config.get<AppConfig['integration']>('integration')?.mode ?? 'mock';
    const storage = config.get<AppConfig['storage']>('storage');

    // Storage:有凭证时用 MinIO,否则 mock
    if (storage?.provider === 'minio' && storage.accessKey && storage.secretKey) {
      this.storage = new MinioStorageAdapter({
        endpoint: storage.endpoint,
        accessKey: storage.accessKey,
        secretKey: storage.secretKey,
        region: storage.region,
      });
    } else {
      this.storage = new MockStorageAdapter();
    }

    if (mode === 'real') {
      this.amap = new AmapRealAdapter(process.env.AMAP_KEY ?? '');
      this.wxpay = new WxpayRealAdapter({
        appId: process.env.WXPAY_APP_ID ?? '',
        mchId: process.env.WXPAY_MCH_ID ?? '',
        apiV3Key: process.env.WXPAY_API_V3_KEY ?? '',
      });
      this.alipay = new AlipayRealAdapter({
        appId: process.env.ALIPAY_APP_ID ?? '',
        privateKey: process.env.ALIPAY_PRIVATE_KEY ?? '',
        publicKey: process.env.ALIPAY_PUBLIC_KEY ?? '',
      });
      this.getui = new GetuiRealAdapter({
        appId: process.env.GETUI_APP_ID ?? '',
        appKey: process.env.GETUI_APP_KEY ?? '',
        masterSecret: process.env.GETUI_MASTER_SECRET ?? '',
      });
      this.sms = new SmsRealAdapter({
        accessKeyId: process.env.ALI_SMS_ACCESS_KEY_ID ?? '',
        accessKeySecret: process.env.ALI_SMS_ACCESS_KEY_SECRET ?? '',
        signName: process.env.ALI_SMS_SIGN_NAME ?? '',
      });
      this.realname = new RealnameRealAdapter({
        accessKeyId: process.env.ALI_REALNAME_ACCESS_KEY_ID ?? '',
        accessKeySecret: process.env.ALI_REALNAME_ACCESS_KEY_SECRET ?? '',
      });
    } else {
      this.amap = new AmapMockAdapter();
      this.wxpay = new WxpayMockAdapter();
      this.alipay = new AlipayMockAdapter();
      this.getui = new GetuiMockAdapter();
      this.sms = new SmsMockAdapter();
      this.realname = new RealnameMockAdapter();
    }

    this.logger.log(`integration mode=${mode}, storage=${this.storage.constructor.name}`);
  }

  async onModuleInit(): Promise<void> {
    const bucket = this.config.get<AppConfig['storage']>('storage')?.bucket ?? 'o2o-dev';
    try {
      await this.storage.ensureBucket(bucket);
    } catch (err) {
      this.logger.warn({ err }, `storage ensureBucket(${bucket}) failed — will retry on first upload`);
    }
  }
}
