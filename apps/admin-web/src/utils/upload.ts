/**
 * 平台 Web 文件上传:POST /api/v1/pub/files/upload
 *
 * - axios FormData,自带 Admin-Token + X-Trace-Id
 * - 返回 { fileId, url, expireAt, size }
 * - bizType 必须在 FileBizScopeMap 允许 ADMIN 的白名单内,典型: 'avatar'、'grocery-image'
 */
import { Header, type ApiResponse } from '@o2o/contracts';
import axios from 'axios';

import { getToken } from './token';
import { genTraceId } from './trace';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://127.0.0.1:3000';
const UPLOAD_URL = '/api/v1/pub/files/upload';

export interface UploadResultVo {
  fileId: string;
  url: string;
  expireAt: number;
  size: number;
}

export async function uploadImage(file: File, bizType: string): Promise<UploadResultVo> {
  const form = new FormData();
  form.append('file', file);
  form.append('bizType', bizType);

  const token = getToken();
  const headers: Record<string, string> = {
    [Header.TraceId]: genTraceId(),
    [Header.IdempotencyKey]: genTraceId(),
  };
  if (token) headers[Header.AdminToken] = token;

  const res = await axios.post<ApiResponse<UploadResultVo>>(BASE_URL + UPLOAD_URL, form, {
    headers,
    timeout: 30000,
  });
  const body = res.data;
  if (body.code !== '0' || !body.data) {
    throw new Error(body.message || '上传失败');
  }
  return body.data;
}

/** 简单的图片格式与大小校验,统一在调用方 try-catch */
export function assertImageFile(file: File, maxBytes = 10 * 1024 * 1024): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('仅支持图片文件');
  }
  if (file.size > maxBytes) {
    throw new Error(`图片不可大于 ${(maxBytes / 1024 / 1024).toFixed(0)} MB`);
  }
}
