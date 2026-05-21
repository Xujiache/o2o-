import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface PrepayReq {
  bizType: 'FOOD' | 'ERRAND' | 'GROCERY';
  orderId: string;
  payChannel: 'wxpay' | 'alipay';
}

/**
 * 真实拉起支付时,后端需在 payParams 中携带渠道侧签名信息。
 * 后端 stage 11 后填充:wxpay 走 JSAPI/小程序,alipay 走 sdk orderInfo。
 */
export interface WxpayPrepayParams {
  nonceStr: string;
  timeStamp: string;
  package: string;
  signType: 'MD5' | 'HMAC-SHA256' | 'RSA';
  paySign: string;
}
export interface AlipayPrepayParams {
  /** alipay SDK 收到的完整支付串 */
  orderInfo: string;
}

export interface PrepayVo {
  payOrderId: string;
  payOrderNo: string;
  /**
   * 渠道 prepay 参数:
   * - mock 模式 → string(后端占位 / 兼容历史)
   * - real 模式 → 渠道签名对象,后端 stage 11 后填充
   */
  payParams: string | WxpayPrepayParams | AlipayPrepayParams;
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
