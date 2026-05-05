import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface CartLine {
  cartItemId: string;
  skuId: string;
  productId: string;
  name: string;
  specValue: string;
  unitPrice: string;
  quantity: number;
  subTotal: string;
}
export interface CartVo {
  storeId: string;
  items: CartLine[];
  goodsAmount: string;
  deliveryFee: string;
  discountAmount: string;
  totalAmount: string;
}

export interface UpsertCartItemReq {
  storeId: string;
  skuId: string;
  quantity: number;
}

export function upsertCartItem(body: UpsertCartItemReq): Promise<ApiResponse<CartVo>> {
  return request<CartVo>({ url: '/api/v1/c/food/cart/items', method: 'POST', data: body });
}
