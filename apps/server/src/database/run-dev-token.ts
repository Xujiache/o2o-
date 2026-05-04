/* eslint-disable no-console */
/**
 * dev 工具:为 4 端各签发一个测试 token,打印出来便于 curl 调试。
 * 用法:pnpm --filter @o2o/server token:dev [scope]
 */
import { resolve } from 'node:path';

import { JwtService } from '@nestjs/jwt';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(__dirname, '../../../../.env') });

interface ScopeConfig {
  scope: 'customer' | 'merchant' | 'rider' | 'admin';
  secretEnv: string;
  defaultRoles: string[];
  /** dev token 用的 sub:数字字符串(后续真实表 id 也是 BIGINT) */
  devSub: string;
}

const SCOPES: ScopeConfig[] = [
  { scope: 'customer', secretEnv: 'JWT_CUSTOMER_SECRET', defaultRoles: ['CUSTOMER'], devSub: '10001' },
  { scope: 'merchant', secretEnv: 'JWT_MERCHANT_SECRET', defaultRoles: ['MERCHANT'], devSub: '20001' },
  { scope: 'rider', secretEnv: 'JWT_RIDER_SECRET', defaultRoles: ['RIDER'], devSub: '30001' },
  { scope: 'admin', secretEnv: 'JWT_ADMIN_SECRET', defaultRoles: ['SUPER_ADMIN'], devSub: '40001' },
];

const target = (process.argv[2] ?? '').toLowerCase();
const ttl = process.env.JWT_ACCESS_TTL ?? '2h';

for (const cfg of SCOPES) {
  if (target && cfg.scope !== target) continue;
  const secret = process.env[cfg.secretEnv];
  if (!secret) {
    console.error(`[dev-token] ${cfg.secretEnv} missing in .env`);
    continue;
  }
  const jwt = new JwtService({ secret });
  const token = jwt.sign({ sub: cfg.devSub, scope: cfg.scope, roles: cfg.defaultRoles }, { expiresIn: ttl });
  console.info(`# ${cfg.scope} token (sub=${cfg.devSub}, roles=${cfg.defaultRoles.join(',')})`);
  console.info(token);
  console.info('');
}
