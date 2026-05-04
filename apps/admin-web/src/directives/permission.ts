/**
 * v-permission 按钮级权限指令。
 * 用法:`<el-button v-permission="'admin:audit:logs:view'">导出</el-button>`
 * 缺失权限 → 元素从 DOM 中移除。
 */
import type { Directive, DirectiveBinding } from 'vue';

import { useUserStore } from '@/stores/user';

function check(binding: DirectiveBinding<string | string[]>): boolean {
  const store = useUserStore();
  const required = binding.value;
  if (!required) return true;
  if (Array.isArray(required)) {
    return required.every((p) => store.has(p));
  }
  return store.has(required);
}

export const permission: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    if (!check(binding)) {
      el.parentElement?.removeChild(el);
    }
  },
  updated(el, binding) {
    if (!check(binding)) {
      el.parentElement?.removeChild(el);
    }
  },
};
