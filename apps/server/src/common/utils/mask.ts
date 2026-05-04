/**
 * 敏感信息脱敏 — 满足 `权限与安全.md` 后台手机号/身份证/银行卡脱敏要求
 */

const PHONE_REGEX = /(1\d{2})\d{4}(\d{4})/g;
const ID_CARD_REGEX = /(\d{4})\d{10}([\dXx]{4})/g;
const BANK_CARD_REGEX = /(\d{4})\d{8,12}(\d{4})/g;

export function maskPhone(s: string): string {
  return s.replace(PHONE_REGEX, '$1****$2');
}

export function maskIdCard(s: string): string {
  return s.replace(ID_CARD_REGEX, '$1**********$2');
}

export function maskBankCard(s: string): string {
  return s.replace(BANK_CARD_REGEX, '$1********$2');
}

/** 字符串中所有可识别的敏感片段批量脱敏(用于日志) */
export function maskAll(s: string): string {
  return maskBankCard(maskIdCard(maskPhone(s)));
}
