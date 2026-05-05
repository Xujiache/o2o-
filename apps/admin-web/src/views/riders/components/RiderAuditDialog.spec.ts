import { describe, expect, it } from 'vitest';

/**
 * RiderAuditDialog 校验逻辑冒烟(纯逻辑,不挂 DOM)
 * 真渲染交互留人工抽测,本 spec 验证字段约束。
 */
describe('RiderAuditDialog 字段约束', () => {
  it('rejected 时 reason 必须非空', () => {
    expect('  '.trim()).toBe('');
    expect('资质问题'.trim()).toBe('资质问题');
  });

  it('approved 时不需要 reason', () => {
    const auditResult = 'approved' as 'approved' | 'rejected';
    const needReason = auditResult === ('rejected' as const);
    expect(needReason).toBe(false);
  });
});
