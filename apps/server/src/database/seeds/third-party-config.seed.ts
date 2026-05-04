import type { DataSource } from 'typeorm';

import { ThirdPartyConfig } from '../entities';

const NOW = Date.now().toString();

/** Stage 0 用 mock,所有 provider 落 disabled,凭证到位再切 active */
const PROVIDERS = ['amap', 'wxpay', 'alipay', 'getui', 'ali-sms', 'ali-realname', 'minio'];

export async function seedThirdPartyConfig(ds: DataSource): Promise<number> {
  const repo = ds.getRepository(ThirdPartyConfig);
  const env = process.env.NODE_ENV ?? 'development';
  // dev 环境 MinIO 使用本地容器,标 active
  for (const provider of PROVIDERS) {
    const existing = await repo.findOne({ where: { provider, env } });
    const status: 'active' | 'disabled' = provider === 'minio' && env === 'development' ? 'active' : 'disabled';
    if (existing) {
      existing.status = status;
      existing.updatedAt = NOW;
      await repo.save(existing);
    } else {
      await repo.insert({
        provider,
        env,
        encryptedSecret: null,
        status,
        lastHealthAt: null,
        errorMessage: null,
        updatedAt: NOW,
      });
    }
  }
  return PROVIDERS.length;
}
