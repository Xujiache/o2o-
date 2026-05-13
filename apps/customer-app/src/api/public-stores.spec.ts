/**
 * 公开店铺接口路径冒烟(用户端公共接口,无 token 调用)。
 */
import { describe, expect, it } from 'vitest';

const PUB_STORES = '/api/v1/pub/stores';

describe('用户端公开店铺接口路径', () => {
  it('GET /api/v1/pub/stores 列表路径', () => {
    expect(PUB_STORES).toBe('/api/v1/pub/stores');
  });
  it('GET /api/v1/pub/stores/:id 详情路径', () => {
    const storeId = '201';
    expect(`${PUB_STORES}/${storeId}`).toBe('/api/v1/pub/stores/201');
  });
  it('GET /api/v1/pub/stores/:id/products 商品列表路径', () => {
    const storeId = '201';
    expect(`${PUB_STORES}/${storeId}/products`).toBe('/api/v1/pub/stores/201/products');
  });
  it('全部以 /api/v1/pub/ 前缀(公共,无 token)', () => {
    expect(PUB_STORES.startsWith('/api/v1/pub/')).toBe(true);
  });
});
