# @o2o/api-client

4 端共享 HTTP 客户端封装。

- **平台 Web**(`apps/admin-web`):用 `createAxiosApiClient`
- **Uni-app 三端**(`customer/merchant/rider`):各端在 `src/utils/request.ts` 中按 `ApiClient` 接口实现一个 `uni.request` 适配器(因为 `uni` 是全局对象,无法在 Node 包里 import)

## 共性能力

- 自动注入对应端 Token(`Customer/Merchant/Rider/Admin-Token`)
- 自动注入 `X-Trace-Id`、写接口注入 `Idempotency-Key`
- 401 → `onUnauthorized` 跳登录
- 业务错误码统一处理(`@o2o/contracts` 的 `ErrorCode`)

## 用法

```ts
import { createAxiosApiClient } from '@o2o/api-client';
import { useAdminTokenStore } from '@/stores/token';

const api = createAxiosApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  scope: 'admin',
  getToken: () => useAdminTokenStore().token,
  onUnauthorized: () => router.push('/login'),
});

const res = await api.request<DictItem[]>({ url: '/api/v1/pub/dictionaries' });
```
