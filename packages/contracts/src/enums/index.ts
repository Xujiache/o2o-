/** 平台主体类型 */
export const OperatorType = {
  CUSTOMER: 'customer',
  MERCHANT: 'merchant',
  RIDER: 'rider',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const;
export type OperatorTypeValue = (typeof OperatorType)[keyof typeof OperatorType];

/** 文件业务类型(file_object.biz_type) */
export const FileBizType = {
  AVATAR: 'avatar',
  USER_REALNAME: 'user-realname',
  MERCHANT_LICENSE: 'merchant-license',
  MERCHANT_LEGAL: 'merchant-legal',
  MERCHANT_FOOD_PERMIT: 'merchant-food-permit',
  STORE_PHOTO: 'store-photo',
  PRODUCT_IMAGE: 'product-image',
  RIDER_REALNAME: 'rider-realname',
  RIDER_HEALTH: 'rider-health',
  GOODS_IMAGE: 'goods-image',
  AFTER_SALE_PROOF: 'after-sale-proof',
  ERRAND_PHOTO: 'errand-photo',
  /** GR-6 — 生鲜商品主图 / 详情图,仅平台运营可上传 */
  GROCERY_IMAGE: 'grocery-image',
} as const;
export type FileBizTypeValue = (typeof FileBizType)[keyof typeof FileBizType];

/** 文件 bizType 与主体 scope 归属白名单 */
export const FileBizScopeMap: Record<FileBizTypeValue, OperatorTypeValue[]> = {
  [FileBizType.AVATAR]: [OperatorType.CUSTOMER, OperatorType.MERCHANT, OperatorType.RIDER, OperatorType.ADMIN],
  [FileBizType.USER_REALNAME]: [OperatorType.CUSTOMER],
  [FileBizType.MERCHANT_LICENSE]: [OperatorType.MERCHANT],
  [FileBizType.MERCHANT_LEGAL]: [OperatorType.MERCHANT],
  [FileBizType.MERCHANT_FOOD_PERMIT]: [OperatorType.MERCHANT],
  [FileBizType.STORE_PHOTO]: [OperatorType.MERCHANT],
  [FileBizType.PRODUCT_IMAGE]: [OperatorType.MERCHANT],
  [FileBizType.RIDER_REALNAME]: [OperatorType.RIDER],
  [FileBizType.RIDER_HEALTH]: [OperatorType.RIDER],
  [FileBizType.GOODS_IMAGE]: [OperatorType.MERCHANT],
  [FileBizType.AFTER_SALE_PROOF]: [OperatorType.CUSTOMER, OperatorType.MERCHANT, OperatorType.RIDER],
  [FileBizType.ERRAND_PHOTO]: [OperatorType.CUSTOMER, OperatorType.RIDER],
  [FileBizType.GROCERY_IMAGE]: [OperatorType.ADMIN],
};

/** 第三方提供商 */
export const ThirdPartyProvider = {
  AMAP: 'amap',
  WXPAY: 'wxpay',
  ALIPAY: 'alipay',
  GETUI: 'getui',
  ALI_SMS: 'ali-sms',
  ALI_REALNAME: 'ali-realname',
  WXLOGIN: 'wxlogin',
  MINIO: 'minio',
  /** AI 对话(OpenAI 兼容协议,默认 DeepSeek)— secret 内为 JSON: { apiKey, baseUrl?, model? } */
  AI_DEEPSEEK: 'ai-deepseek',
} as const;
export type ThirdPartyProviderValue = (typeof ThirdPartyProvider)[keyof typeof ThirdPartyProvider];

/** 第三方健康状态 */
export const ProviderHealthStatus = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
  ERROR: 'error',
} as const;
export type ProviderHealthStatusValue = (typeof ProviderHealthStatus)[keyof typeof ProviderHealthStatus];
