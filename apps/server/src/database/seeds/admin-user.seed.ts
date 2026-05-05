import type { DataSource } from 'typeorm';

import { hashPassword } from '../../common/utils/password.util';
import { AdminUser } from '../entities';

const NOW = Date.now().toString();

const DEFAULT_USERNAME = 'super_admin';
const DEFAULT_DISPLAY_NAME = '超级管理员';
const DEFAULT_PASSWORD = 'O2o@2026-Admin';
const DEFAULT_ROLE_CODES = ['SUPER_ADMIN'];

/**
 * Stage 4 默认管理员种子。
 * - 重跑时仅在不存在时创建,不覆盖已有密码 / 状态。
 * - 真实环境密码必须立即在控制台手动改(后续提供 PATCH 接口)。
 */
export async function seedAdminUser(ds: DataSource): Promise<number> {
  const repo = ds.getRepository(AdminUser);
  const existing = await repo.findOne({ where: { username: DEFAULT_USERNAME } });
  if (existing) return 0;

  await repo.insert({
    username: DEFAULT_USERNAME,
    passwordHash: hashPassword(DEFAULT_PASSWORD),
    displayName: DEFAULT_DISPLAY_NAME,
    status: 'active',
    roleCodes: DEFAULT_ROLE_CODES,
    loginFailedCount: 0,
    lockedUntil: '0',
    lastLoginAt: '0',
    createdAt: NOW,
    updatedAt: NOW,
  });
  return 1;
}
