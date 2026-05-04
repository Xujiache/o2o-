import type { DataSource } from 'typeorm';

import { SysErrorCode } from '../entities';

const NOW = Date.now().toString();

interface ErrorCodeRow {
  code: string;
  i18nZh: string;
  i18nEn: string;
  level: 'info' | 'warn' | 'error';
}

/** 来源:全局接口契约规范.md 错误码集 + CONSENSUS § 6 */
const ROWS: ErrorCodeRow[] = [
  { code: 'INVALID_PARAM', i18nZh: '参数有误,请检查后重试', i18nEn: 'Invalid parameter', level: 'warn' },
  { code: 'UNAUTHORIZED', i18nZh: '请先登录', i18nEn: 'Unauthorized', level: 'warn' },
  { code: 'FORBIDDEN', i18nZh: '无权限执行该操作', i18nEn: 'Forbidden', level: 'warn' },
  { code: 'DATA_NOT_FOUND', i18nZh: '数据不存在或已被删除', i18nEn: 'Data not found', level: 'warn' },
  { code: 'STATUS_INVALID', i18nZh: '当前状态不允许该操作', i18nEn: 'Invalid status transition', level: 'warn' },
  { code: 'DUPLICATE_REQUEST', i18nZh: '请勿重复操作', i18nEn: 'Duplicate request', level: 'warn' },
  { code: 'THIRD_PARTY_ERROR', i18nZh: '第三方服务暂时不可用,请稍后再试', i18nEn: 'Third-party error', level: 'error' },
  { code: 'RATE_LIMIT_EXCEEDED', i18nZh: '操作过于频繁,请稍后再试', i18nEn: 'Rate limit exceeded', level: 'warn' },
  { code: 'INTERNAL_ERROR', i18nZh: '服务异常,请稍后再试', i18nEn: 'Internal server error', level: 'error' },
];

export async function seedErrorCodes(ds: DataSource): Promise<number> {
  const repo = ds.getRepository(SysErrorCode);
  for (const r of ROWS) {
    const existing = await repo.findOne({ where: { code: r.code } });
    if (existing) {
      Object.assign(existing, { i18nZh: r.i18nZh, i18nEn: r.i18nEn, level: r.level, updatedAt: NOW });
      await repo.save(existing);
    } else {
      await repo.insert({ ...r, description: null, updatedAt: NOW });
    }
  }
  return ROWS.length;
}
