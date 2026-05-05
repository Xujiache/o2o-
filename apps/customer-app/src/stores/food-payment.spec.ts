import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useFoodPaymentStore } from './food-payment';

describe('food-payment store', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('setPrepay / setPaying / setResult', () => {
    const s = useFoodPaymentStore();
    s.setPrepay({ payOrderId: '800001', payOrderNo: 'P1', payParams: '{}', expireAt: 0 });
    s.setPaying(true);
    s.setResult('success');
    expect(s.prepay?.payOrderId).toBe('800001');
    expect(s.paying).toBe(true);
    expect(s.result).toBe('success');
  });

  it('reset 清空', () => {
    const s = useFoodPaymentStore();
    s.setPrepay({ payOrderId: '1', payOrderNo: '1', payParams: '', expireAt: 0 });
    s.setResult('fail');
    s.reset();
    expect(s.prepay).toBeNull();
    expect(s.paying).toBe(false);
    expect(s.result).toBeNull();
  });
});
