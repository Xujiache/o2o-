import { defineStore } from 'pinia';

import { quoteErrand, type QuoteErrandReq, type QuoteVo } from '@/api/errand-quotes';

interface State {
  current: QuoteVo | null;
  lastReq: QuoteErrandReq | null;
}

export const useErrandQuoteStore = defineStore('errand-quote', {
  state: (): State => ({ current: null, lastReq: null }),
  actions: {
    async fetch(req: QuoteErrandReq): Promise<QuoteVo | null> {
      const r = await quoteErrand(req);
      if (r.code === '0' && r.data) {
        this.current = r.data;
        this.lastReq = req;
        return r.data;
      }
      return null;
    },
    reset(): void {
      this.current = null;
      this.lastReq = null;
    },
    isExpired(): boolean {
      if (!this.current) return true;
      return this.current.expireAt < Date.now();
    },
  },
});
