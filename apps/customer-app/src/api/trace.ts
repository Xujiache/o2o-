import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface TraceAttachment {
  type: 'image' | 'pdf' | 'video' | 'file';
  fileId: string;
  url?: string;
  name?: string;
}

export interface TraceRecord {
  traceRecordId: string;
  traceQrId: string | null;
  traceBatchId: string;
  nodeType: number;
  nodeTitle: string;
  content: string | null;
  attachments: TraceAttachment[] | null;
  happenedAt: number;
  operatorName: string | null;
  createdAt: number;
}

export interface CustomerTraceInfo {
  product: { productId: string; name: string; coverImageFileId: string | null; productType: string };
  batch: {
    traceBatchId: string;
    batchNo: string;
    producedAt: number;
    shelfLifeDays: number | null;
    supplierName: string | null;
  };
  qr: { traceQrId: string; qrCode: string; scanCount: number; firstScanAt: number | null };
  records: TraceRecord[];
}

export function getTraceInfo(code: string, sig: string): Promise<ApiResponse<CustomerTraceInfo>> {
  return request<CustomerTraceInfo>({
    url: '/api/v1/c/trace/info',
    method: 'GET',
    params: { code, sig },
    authRequired: false,
  });
}
