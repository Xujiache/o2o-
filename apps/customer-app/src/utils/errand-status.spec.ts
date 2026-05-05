import { describe, expect, it } from 'vitest';

import { STATUS_LABEL_ERRAND, TYPE_LABEL, URGENT_LABEL, statusLabel, typeLabel, urgentLabel } from './errand-status';

describe('errand-status dictionaries', () => {
  it('STATUS_LABEL_ERRAND 含 8 个状态', () => {
    expect(Object.keys(STATUS_LABEL_ERRAND)).toHaveLength(8);
    expect(STATUS_LABEL_ERRAND.WAIT_PAY).toBe('待支付');
    expect(STATUS_LABEL_ERRAND.COMPLETED).toBe('已完成');
  });

  it('URGENT_LABEL 3 档', () => {
    expect(URGENT_LABEL.standard).toBe('标准');
    expect(URGENT_LABEL.fast).toBe('加急');
    expect(URGENT_LABEL.express).toBe('特急');
  });

  it('TYPE_LABEL 4 类', () => {
    expect(Object.keys(TYPE_LABEL)).toHaveLength(4);
    expect(TYPE_LABEL.BUY).toBe('帮我买');
  });

  it('statusLabel 未知状态返原值', () => {
    expect(statusLabel('XXX')).toBe('XXX');
    expect(statusLabel('PAID')).toBe('待派单');
  });

  it('urgentLabel/typeLabel 未知值返原值', () => {
    expect(urgentLabel('UNKNOWN')).toBe('UNKNOWN');
    expect(typeLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});
