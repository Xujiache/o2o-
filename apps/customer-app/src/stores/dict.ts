/**
 * 字典缓存 Store:从 /pub/dictionaries 加载,按 dictType 索引。
 * 状态展示必须引用后端枚举,前端禁止硬编码中文 — 见前端页面与接口对接.md。
 */
import { defineStore } from 'pinia';

import { type DictItem, getDictionaries } from '@/api';

interface State {
  loaded: boolean;
  loading: boolean;
  byType: Record<string, DictItem[]>;
  error: string | null;
}

export const useDictStore = defineStore('dict', {
  state: (): State => ({
    loaded: false,
    loading: false,
    byType: {},
    error: null,
  }),
  getters: {
    typeList(state): string[] {
      return Object.keys(state.byType);
    },
  },
  actions: {
    async load(typeList?: string[]): Promise<void> {
      if (this.loading) return;
      this.loading = true;
      this.error = null;
      try {
        const res = await getDictionaries(typeList);
        if (res.code !== '0') {
          this.error = res.message;
          return;
        }
        const map: Record<string, DictItem[]> = { ...this.byType };
        (res.data ?? []).forEach((item) => {
          if (!map[item.dictType]) map[item.dictType] = [];
          map[item.dictType]!.push(item);
        });
        this.byType = map;
        this.loaded = true;
      } catch (e: unknown) {
        this.error = e instanceof Error ? e.message : String(e);
      } finally {
        this.loading = false;
      }
    },
    label(dictType: string, code: string): string {
      const list = this.byType[dictType];
      if (!list) return code;
      const found = list.find((it) => it.code === code);
      return found?.label ?? code;
    },
  },
});
