/** 当前 preview / 当前 order 状态(用于确认订单页 → 收银台 → 支付结果链路) */
import { defineStore } from 'pinia';

import type { PreviewVo, SubmitVo } from '@/api/food-orders';

interface State {
  preview: PreviewVo | null;
  submitted: SubmitVo | null;
  storeId: string | null;
  payChannel: 'wxpay' | 'alipay';
}

export const useFoodOrderStore = defineStore('food-order', {
  state: (): State => ({ preview: null, submitted: null, storeId: null, payChannel: 'wxpay' }),
  actions: {
    setPreview(p: PreviewVo, storeId: string): void {
      this.preview = p;
      this.storeId = storeId;
    },
    setSubmitted(s: SubmitVo): void {
      this.submitted = s;
    },
    setPayChannel(c: 'wxpay' | 'alipay'): void {
      this.payChannel = c;
    },
    reset(): void {
      this.preview = null;
      this.submitted = null;
      this.storeId = null;
    },
  },
});
