# @o2o/contracts

O2O 平台 4 端共享契约。**单一权威来源**:错误码、状态枚举、响应类型、Header / 路径前缀常量。

> 严禁前端硬编码状态文案;状态展示必须通过 `/pub/dictionaries` 取后端字典再渲染。

## 内容

| 模块                                     | 文件                 |
| ---------------------------------------- | -------------------- |
| 错误码 + 默认文案                        | `error-codes.ts`     |
| 统一响应 + 分页                          | `response.ts`        |
| HTTP Header 与路径前缀常量               | `headers.ts`         |
| 外卖状态机                               | `status/takeaway.ts` |
| 跑腿状态机                               | `status/errand.ts`   |
| 业务枚举(操作主体/文件业务/第三方提供商) | `enums/index.ts`     |

## 使用

```ts
import { ErrorCode, ApiResponse, Header, Takeaway, FileBizType } from '@o2o/contracts';

if (res.code === ErrorCode.UNAUTHORIZED) {
  /* 跳登录 */
}

const status: Takeaway.TakeawayOrderStatusValue = Takeaway.TakeawayOrderStatus.WAIT_PAY;
```
