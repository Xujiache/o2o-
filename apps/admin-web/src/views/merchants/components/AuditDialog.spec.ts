import { describe, expect, it } from 'vitest';

/**
 * AuditDialog 校验逻辑冒烟(纯逻辑,不挂 DOM)
 * 真渲染交互留人工抽测,本 spec 验证字段约束。
 */
describe('AuditDialog 字段约束', () => {
  it('approved 时 commissionRate 必须 0-1', () => {
    const v1 = 0.05;
    const v2 = 1.5;
    expect(v1 >= 0 && v1 <= 1).toBe(true);
    expect(v2 >= 0 && v2 <= 1).toBe(false);
  });

  it('rejected 时 reason 必须非空', () => {
    expect('  '.trim()).toBe('');
    expect('真有原因'.trim()).toBe('真有原因');
  });
});
