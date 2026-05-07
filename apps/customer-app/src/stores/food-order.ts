/** 当前 preview / 当前 order 状态(用于确认订单页 → 收银台 → 支付结果链路) */
import { defineStore } from 'pinia';

import type { PreviewVo, SubmitVo } from '@/api/food-orders';

interface State {
  preview: PreviewVo | null;
  submitted: SubmitVo | null;
  storeId: string | null;
  payChannel: 'wxpay' | 'alipay';
  /** 跨页面选地址回传:address/list 写入,confirm 消费一次后清空 */
  pickedAddressId: string | null;
}

export const useFoodOrderStore = defineStore('food-order', {
  state: (): State => ({
    preview: null,
    submitted: null,
    storeId: null,
    payChannel: 'wxpay',
    pickedAddressId: null,
  }),
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
    pickAddress(id: string): void {
      this.pickedAddressId = id;
    },
    consumePickedAddress(): string | null {
      const id = this.pickedAddressId;
      this.pickedAddressId = null;
      return id;
    },
    reset(): void {
      this.preview = null;
      this.submitted = null;
      this.storeId = null;
    },
  },
});
