/** 4 类跑腿表单暂存 — 在跳转报价页时保留输入,避免返回丢失 */
import { defineStore } from 'pinia';

import type { QuoteErrandReq } from '@/api/errand-quotes';

interface State {
  draft: QuoteErrandReq | null;
}

export const useErrandFormStore = defineStore('errand-form', {
  state: (): State => ({ draft: null }),
  actions: {
    setDraft(d: QuoteErrandReq): void {
      this.draft = d;
    },
    clear(): void {
      this.draft = null;
    },
  },
});
