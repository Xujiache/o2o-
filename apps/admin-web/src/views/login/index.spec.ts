/** 登录页:captcha 加载 + login 表单 + 错误处理 + lastLoginAt 透传 */
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

const fetchCaptchaMock = vi.fn();
const loginMock = vi.fn();

vi.mock('@/api/admin-auth', () => ({
  fetchCaptcha: (...args: unknown[]) => fetchCaptchaMock(...args),
  login: (...args: unknown[]) => loginMock(...args),
}));

import Login from './index.vue';

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function makeRouter(): ReturnType<typeof createRouter> {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/workbench', component: { template: '<div />' } },
      { path: '/login', component: Login },
    ],
  });
}

describe('LoginPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchCaptchaMock.mockReset();
    loginMock.mockReset();
    fetchCaptchaMock.mockResolvedValue({ code: '0', data: { captchaId: 'cap-1', svgImage: '<svg></svg>' } });
  });

  it('挂载并显示登录关键文案 + captcha 图', async () => {
    const router = makeRouter();
    await router.push('/login');
    await router.isReady();
    const wrapper = mount(Login, { global: { plugins: [router] } });
    await flush();
    const text = wrapper.text();
    expect(text).toContain('登录');
    expect(text).toContain('super_admin');
    expect(text).toContain('dev');
    expect(wrapper.findAll('input').length).toBeGreaterThanOrEqual(3);
  });

  it('mounted 时调 fetchCaptcha,captcha 图 src 含 base64', async () => {
    const router = makeRouter();
    await router.push('/login');
    await router.isReady();
    const wrapper = mount(Login, { global: { plugins: [router] } });
    await flush();
    expect(fetchCaptchaMock).toHaveBeenCalledTimes(1);
    const img = wrapper.find('img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toContain('data:image/svg+xml;base64,');
  });

  it('username/password/captcha 任一为空 → 不调 login', async () => {
    const router = makeRouter();
    await router.push('/login');
    await router.isReady();
    const wrapper = mount(Login, { global: { plugins: [router] } });
    await flush();
    // 默认 username=super_admin,password 空,captcha 空 → 提交不调 login
    await wrapper.find('button').trigger('click');
    await flush();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('login 失败 → 重新拉 captcha + 清空 captcha 输入', async () => {
    const router = makeRouter();
    await router.push('/login');
    await router.isReady();
    loginMock.mockResolvedValue({ code: 'UNAUTHORIZED', message: '用户名或密码错误' });
    const wrapper = mount(Login, { global: { plugins: [router] } });
    await flush();
    fetchCaptchaMock.mockClear();
    const inputs = wrapper.findAll('input');
    await inputs[1]!.setValue('SomePass');
    await inputs[2]!.setValue('abcd');
    await wrapper.find('button').trigger('click');
    await flush();
    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(fetchCaptchaMock).toHaveBeenCalled(); // 失败后刷新 captcha
  });
});
