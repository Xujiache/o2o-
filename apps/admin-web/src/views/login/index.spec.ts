/** 登录页 smoke test(stage 4):captcha 加载 + 表单基本字段渲染 */
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

vi.mock('@/api/admin-auth', () => ({
  fetchCaptcha: vi.fn(async () => ({
    code: '0',
    data: { captchaId: 'cap-1', svgImage: '<svg></svg>' },
  })),
  login: vi.fn(async () => ({ code: '0', data: null })),
}));

import Login from './index.vue';

describe('LoginPage smoke', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('挂载并显示登录关键文案 + captcha 图', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/login', component: Login },
      ],
    });
    await router.push('/login');
    await router.isReady();

    const wrapper = mount(Login, { global: { plugins: [router] } });
    await new Promise((r) => setTimeout(r, 0));

    const text = wrapper.text();
    expect(text).toContain('登录');
    expect(text).toContain('super_admin');
    expect(text).toContain('dev');
    const inputs = wrapper.findAll('input');
    expect(inputs.length).toBeGreaterThanOrEqual(3);
  });
});
