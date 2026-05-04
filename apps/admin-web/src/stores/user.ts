/**
 * 平台 Web 用户与权限 store。
 * stage 0 仅 mock 登录(选 SUPER_ADMIN / AUDITOR);stage 4 接入真登录接口。
 */
import { defineStore } from 'pinia';

import {
  clearAuth,
  getPermissions,
  getPrincipal,
  getToken,
  setPermissions,
  setPrincipal,
  setToken,
  type PrincipalSummary,
} from '@/utils/token';

interface State {
  token: string;
  principal: PrincipalSummary | null;
  permissions: string[];
}

export const useUserStore = defineStore('user', {
  state: (): State => ({
    token: getToken() ?? '',
    principal: getPrincipal(),
    permissions: getPermissions(),
  }),
  getters: {
    isLoggedIn: (state): boolean => !!state.token,
    has:
      (state) =>
      (point: string): boolean =>
        state.permissions.includes(point),
  },
  actions: {
    /** stage 0 mock 登录 — 直接写 token + permissions */
    mockLogin(payload: { token: string; principal: PrincipalSummary; permissions: string[] }): void {
      setToken(payload.token);
      setPrincipal(payload.principal);
      setPermissions(payload.permissions);
      this.token = payload.token;
      this.principal = payload.principal;
      this.permissions = payload.permissions;
    },
    logout(): void {
      clearAuth();
      this.token = '';
      this.principal = null;
      this.permissions = [];
    },
  },
});
