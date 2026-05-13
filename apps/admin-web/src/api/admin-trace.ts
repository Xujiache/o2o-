/**
 * 平台 Web - 溯源中心接口封装。
 *
 * 后端契约位置: apps/server/src/modules/trace/trace.controller.ts (TraceAdminController)
 */
import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export const TraceEndpoints = {
  Batches: '/api/v1/admin/trace/batches',
  BatchDetail: (id: string): string => `/api/v1/admin/trace/batches/${id}`,
  GenerateQr: (id: string): string => `/api/v1/admin/trace/batches/${id}/qrcodes/generate`,
  GenerateQrStatus: (id: string, taskId: string): string =>
    `/api/v1/admin/trace/batches/${id}/qrcodes/generate/${taskId}`,
  ExportCsv: (id: string): string => `/api/v1/admin/trace/batches/${id}/qrcodes/export.csv`,
  QrLookup: '/api/v1/admin/trace/qrcodes/lookup',
  QrDetail: (qrId: string): string => `/api/v1/admin/trace/qrcodes/${qrId}`,
  Records: '/api/v1/admin/trace/records',
  RecordDetail: (id: string): string => `/api/v1/admin/trace/records/${id}`,
  Stats: (id: string): string => `/api/v1/admin/trace/batches/${id}/stats`,
} as const;

// ============= types =============

export type TraceQrGenStatus = 'queued' | 'running' | 'done' | 'failed';
export type TraceNodeType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const TRACE_NODE_LABEL: Record<TraceNodeType, string> = {
  1: '产地',
  2: '加工',
  3: '检测',
  4: '仓储',
  5: '物流',
  6: '上架',
  7: '其他',
};

export interface TraceAttachmentVo {
  type: 'image' | 'pdf' | 'video' | 'file';
  fileId: string;
  url?: string;
  name?: string;
}

export interface TraceBatchVo {
  traceBatchId: string;
  batchNo: string;
  productId: string;
  totalCount: number;
  producedAt: number;
  shelfLifeDays: number | null;
  supplierName: string | null;
  /** 1 active, 2 disabled (后端 number,前端按需展示) */
  status: number;
  createdAt: number;
  /** 已生成 QR 数;仅在详情接口返回 */
  generatedCount?: number;
}

export interface BatchListPageVo {
  items: TraceBatchVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export interface ListBatchesQuery {
  productId?: string;
  pageNo?: number;
  pageSize?: number;
}

export interface CreateTraceBatchReq {
  productId: string;
  batchNo: string;
  totalCount: number;
  producedAt: number;
  shelfLifeDays?: number;
  supplierName?: string;
}

export interface GenerateQrcodesReq {
  count: number;
}

export interface GenerateQrcodesVo {
  taskId: string;
  traceBatchId: string;
  requested: number;
  status: TraceQrGenStatus;
  /** 已完成数 */
  progress: number;
  errorMessage: string | null;
}

export interface QrLookupVo {
  traceQrId: string;
  qrCode: string;
  traceBatchId: string;
  batchNo: string;
  productId: string;
  productName: string;
  serialNo: number;
  status: number;
  scanCount: number;
  firstScanAt: number | null;
}

export interface TraceRecordVo {
  traceRecordId: string;
  traceQrId: string | null;
  traceBatchId: string;
  nodeType: number;
  nodeTitle: string;
  content: string | null;
  attachments: TraceAttachmentVo[] | null;
  happenedAt: number;
  operatorName: string | null;
  createdAt: number;
}

export interface QrDetailVo extends QrLookupVo {
  records: TraceRecordVo[];
}

export interface CreateTraceRecordReq {
  traceBatchId: string;
  traceQrId?: string;
  nodeType: TraceNodeType;
  nodeTitle: string;
  content?: string;
  attachments?: TraceAttachmentVo[];
  happenedAt: number;
}

export interface UpdateTraceRecordReq {
  nodeTitle?: string;
  content?: string;
  attachments?: TraceAttachmentVo[];
  happenedAt?: number;
}

export interface BatchStatsVo {
  batchNo: string;
  totalScans: number;
  uniqueQrScanned: number;
}

// ============= functions =============

export function listBatches(q: ListBatchesQuery): Promise<ApiResponse<BatchListPageVo>> {
  return request<BatchListPageVo>({ url: TraceEndpoints.Batches, method: 'GET', params: q });
}

export function createBatch(body: CreateTraceBatchReq): Promise<ApiResponse<TraceBatchVo>> {
  return request<TraceBatchVo>({ url: TraceEndpoints.Batches, method: 'POST', data: body });
}

export function getBatchDetail(id: string): Promise<ApiResponse<TraceBatchVo>> {
  return request<TraceBatchVo>({ url: TraceEndpoints.BatchDetail(id), method: 'GET' });
}

export function generateQrcodes(id: string, body: GenerateQrcodesReq): Promise<ApiResponse<GenerateQrcodesVo>> {
  return request<GenerateQrcodesVo>({ url: TraceEndpoints.GenerateQr(id), method: 'POST', data: body });
}

export function getGenerateQrStatus(id: string, taskId: string): Promise<ApiResponse<GenerateQrcodesVo>> {
  return request<GenerateQrcodesVo>({ url: TraceEndpoints.GenerateQrStatus(id, taskId), method: 'GET' });
}

export function lookupQr(code: string): Promise<ApiResponse<QrLookupVo>> {
  return request<QrLookupVo>({ url: TraceEndpoints.QrLookup, method: 'GET', params: { code } });
}

export function getQrDetail(qrId: string): Promise<ApiResponse<QrDetailVo>> {
  return request<QrDetailVo>({ url: TraceEndpoints.QrDetail(qrId), method: 'GET' });
}

export function createRecord(body: CreateTraceRecordReq): Promise<ApiResponse<TraceRecordVo>> {
  return request<TraceRecordVo>({ url: TraceEndpoints.Records, method: 'POST', data: body });
}

export function updateRecord(id: string, body: UpdateTraceRecordReq): Promise<ApiResponse<TraceRecordVo>> {
  return request<TraceRecordVo>({ url: TraceEndpoints.RecordDetail(id), method: 'PUT', data: body });
}

export function deleteRecord(id: string): Promise<ApiResponse<{ ok: true }>> {
  return request<{ ok: true }>({ url: TraceEndpoints.RecordDetail(id), method: 'DELETE' });
}

export function getBatchStats(id: string): Promise<ApiResponse<BatchStatsVo>> {
  return request<BatchStatsVo>({ url: TraceEndpoints.Stats(id), method: 'GET' });
}

/**
 * CSV 导出:走 axios 拿 blob + Admin-Token,前端触发文件下载。
 *
 * 不能简单 window.open,因为 Admin-Token 通过 localStorage 注入 header,
 * 浏览器原生导航不会带上自定义 header。这里复用 request 拦截器拿到带 token + trace-id 的 blob。
 */
export async function downloadBatchCsv(id: string, filenameHint?: string): Promise<void> {
  const { default: axios } = await import('axios');
  const { Header } = await import('@o2o/contracts');
  const { getToken } = await import('@/utils/token');
  const { genTraceId } = await import('@/utils/trace');

  const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://127.0.0.1:3000';
  const token = getToken();
  const resp = await axios.get<Blob>(`${BASE_URL}${TraceEndpoints.ExportCsv(id)}`, {
    responseType: 'blob',
    headers: {
      ...(token ? { [Header.AdminToken]: token } : {}),
      [Header.TraceId]: genTraceId(),
    },
  });

  // 优先从 Content-Disposition 解析 filename
  const cd = resp.headers['content-disposition'] as string | undefined;
  let filename = filenameHint || `trace-batch-${id}.csv`;
  if (cd) {
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
    if (m && m[1]) filename = decodeURIComponent(m[1]);
  }

  const blob = new Blob([resp.data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
