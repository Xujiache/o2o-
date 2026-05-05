/**
 * 平台 Web 用户与权限 store。
 * stage 0 仅 mock 登录;stage 4 接入真 admin-auth(用户名 + 密码 + captcha)。
 */
import { defineStore } from 'pinia';

import {
  clearAuth,
  getLastLoginAt,
  getPermissions,
  getPrincipal,
  getRefreshToken,
  getToken,
  setLastLoginAt,
  setPermissions,
  setPrincipal,
  setRefreshToken,
  setToken,
  type PrincipalSummary,
} from '@/utils/token';

interface State {
  token: string;
  refreshToken: string;
  principal: PrincipalSummary | null;
  permissions: string[];
  lastLoginAt: number;
}

export const useUserStore = defineStore('user', {
  state: (): State => ({
    token: getToken() ?? '',
    refreshToken: getRefreshToken() ?? '',
    principal: getPrincipal(),
    permissions: getPermissions(),
    lastLoginAt: getLastLoginAt(),
  }),
  getters: {
    isLoggedIn: (state): boolean => !!state.token,
    has:
      (state) =>
      (point: string): boolean =>
        state.permissions.includes(point),
  },
  actions: {
    /** stage 0 mock 登录 — 直接写 token + permissions(dev token 调试用) */
    mockLogin(payload: { token: string; principal: PrincipalSummary; permissions: string[] }): void {
      setToken(payload.token);
      setPrincipal(payload.principal);
      setPermissions(payload.permissions);
      this.token = payload.token;
      this.principal = payload.principal;
      this.permissions = payload.permissions;
    },
    /** stage 4 真登录:接 admin-auth login response */
    onLoginSuccess(payload: {
      adminToken: string;
      refreshToken: string;
      adminUserId: string;
      username: string;
      displayName: string;
      roleCodes: string[];
      permissions: string[];
      lastLoginAt: number;
    }): void {
      setToken(payload.adminToken);
      setRefreshToken(payload.refreshToken);
      const principal: PrincipalSummary = {
        principalId: payload.adminUserId,
        scope: 'admin',
        roles: payload.roleCodes,
        displayName: payload.displayName,
        username: payload.username,
      };
      setPrincipal(principal);
      setPermissions(payload.permissions);
      setLastLoginAt(payload.lastLoginAt);
      this.token = payload.adminToken;
      this.refreshToken = payload.refreshToken;
      this.principal = principal;
      this.permissions = payload.permissions;
      this.lastLoginAt = payload.lastLoginAt;
    },
    logout(): void {
      clearAuth();
      this.token = '';
      this.refreshToken = '';
      this.principal = null;
      this.permissions = [];
      this.lastLoginAt = 0;
    },
  },
});
