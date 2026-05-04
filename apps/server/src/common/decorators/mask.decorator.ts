import { Transform } from 'class-transformer';

import { maskBankCard, maskIdCard, maskPhone } from '../utils/mask';

export type MaskType = 'phone' | 'idcard' | 'bankcard';

/**
 * 字段脱敏装饰器(序列化到响应时生效)。
 *
 * ```ts
 * class UserVo {
 *   @Mask('phone') phone!: string;
 *   @Mask('idcard') idCard!: string;
 * }
 * ```
 */
export function Mask(type: MaskType): PropertyDecorator {
  return Transform(
    ({ value }) => {
      if (typeof value !== 'string') return value;
      switch (type) {
        case 'phone':
          return maskPhone(value);
        case 'idcard':
          return maskIdCard(value);
        case 'bankcard':
          return maskBankCard(value);
        default:
          return value;
      }
    },
    { toPlainOnly: true },
  );
}
