import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface PrepayReq {
  bizType: 'FOOD' | 'ERRAND';
  orderId: string;
  payChannel: 'wxpay' | 'alipay';
}
export interface PrepayVo {
  payOrderId: string;
  payOrderNo: string;
  payParams: string;
  expireAt: number;
}

export function prepay(body: PrepayReq): Promise<ApiResponse<PrepayVo>> {
  return request<PrepayVo>({ url: '/api/v1/c/payments/prepay', method: 'POST', data: body });
}

export function simulatePayCallback(
  channel: 'wxpay' | 'alipay',
  outTradeNo: string,
  paidAmountCents: number,
): Promise<void> {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:3000';
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${base}/api/v1/callback/payments/${channel}`,
      method: 'POST',
      header: { 'content-type': 'application/json', 'x-mock-sign': 'mock-sign' },
      data: { outTradeNo, paidAmountCents, paidAt: Date.now() },
      success: (res) => {
        const data = res.data as { ok?: boolean } | undefined;
        if (res.statusCode === 200 && data?.ok) resolve();
        else reject(new Error(`支付回调失败: HTTP ${res.statusCode}`));
      },
      fail: (err) => reject(new Error(err.errMsg || '支付回调请求失败')),
    });
  });
}
