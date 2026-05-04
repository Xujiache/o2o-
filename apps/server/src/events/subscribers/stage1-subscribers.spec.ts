import type { Repository } from 'typeorm';

import type { RiskUserTag } from '../../database/entities';
import type { CustomerAuthService } from '../../modules/customer-auth/customer-auth.service';

import { CustomerAccountDisabledSubscriber } from './customer-account-disabled.subscriber';
import { CustomerLoggedInSubscriber } from './customer-logged-in.subscriber';
import { CustomerRealnameVerifiedSubscriber } from './customer-realname-verified.subscriber';
import { CustomerRegisteredSubscriber } from './customer-registered.subscriber';

describe('CustomerRegisteredSubscriber', () => {
  it('记录日志,不抛错', () => {
    const sub = new CustomerRegisteredSubscriber();
    expect(() =>
      sub.handle({ userId: '1', mobile: '13800000001', registerSource: 'mobile', deviceId: 'd1' }),
    ).not.toThrow();
  });
});

describe('CustomerLoggedInSubscriber', () => {
  it('记录日志,不抛错', () => {
    const sub = new CustomerLoggedInSubscriber();
    expect(() => sub.handle({ userId: '1', deviceId: 'd1', ip: '1.1.1.1', scene: 'login' })).not.toThrow();
  });
});

describe('CustomerRealnameVerifiedSubscriber', () => {
  it('删除该用户的 high_value_blocked 风控标签', async () => {
    const repo = {
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    } as unknown as jest.Mocked<Repository<RiskUserTag>>;
    const sub = new CustomerRealnameVerifiedSubscriber(repo);
    await sub.handle({ userId: '100', verifiedAt: Date.now() });
    expect(repo.delete).toHaveBeenCalledWith({ userId: '100', tagType: 'high_value_blocked' });
  });
});

describe('CustomerAccountDisabledSubscriber', () => {
  it('调用 customerAuth.revokeAllDevices', async () => {
    const customerAuth = {
      revokeAllDevices: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CustomerAuthService>;
    const sub = new CustomerAccountDisabledSubscriber(customerAuth);
    await sub.handle({ userId: '200', operatorId: 'admin-1', reason: '违规' });
    expect(customerAuth.revokeAllDevices).toHaveBeenCalledWith('200');
  });
});
