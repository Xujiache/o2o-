/** 登录页 smoke test:渲染不报错,关键文案存在 */
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import Login from './index.vue';

describe('LoginPage smoke', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('挂载并显示登录占位文案 + 2 个身份按钮', async () => {
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

    const text = wrapper.text();
    expect(text).toContain('登录');
    expect(text).toContain('SUPER_ADMIN');
    expect(text).toContain('AUDITOR');
    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});
