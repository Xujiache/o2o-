/** 收银台支付状态 */
import { defineStore } from 'pinia';

import type { PrepayVo } from '@/api/food-payments';

interface State {
  prepay: PrepayVo | null;
  paying: boolean;
  result: 'success' | 'fail' | null;
}

export const useFoodPaymentStore = defineStore('food-payment', {
  state: (): State => ({ prepay: null, paying: false, result: null }),
  actions: {
    setPrepay(p: PrepayVo): void {
      this.prepay = p;
    },
    setPaying(p: boolean): void {
      this.paying = p;
    },
    setResult(r: 'success' | 'fail' | null): void {
      this.result = r;
    },
    reset(): void {
      this.prepay = null;
      this.paying = false;
      this.result = null;
    },
  },
});
