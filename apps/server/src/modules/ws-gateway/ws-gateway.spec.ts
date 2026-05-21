import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ErrandOrder } from '../../database/entities/errand-order.entity';
import { FoodOrder } from '../../database/entities/food-order.entity';
import { RiderAccount } from '../../database/entities/rider-account.entity';
import { RiderTask } from '../../database/entities/rider-task.entity';
import { Store } from '../../database/entities/store.entity';
import { AuthService } from '../auth/auth.service';

import { isScopeAllowedForTopic, parseTopic, TopicBuilder } from './ws-topic.util';
import { WsGateway } from './ws.gateway';

interface FakeSocket {
  id: string;
  handshake: { query: Record<string, string> };
  data: { principal?: unknown };
  disconnect: jest.Mock;
  emit: jest.Mock;
  join: jest.Mock;
  leave: jest.Mock;
}

function makeSocket(query: Record<string, string> = {}): FakeSocket {
  return {
    id: 's-' + Math.random().toString(36).slice(2, 8),
    handshake: { query },
    data: {},
    disconnect: jest.fn(),
    emit: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
  };
}

describe('ws-topic.util', () => {
  it('parses customer-order topic', () => {
    expect(parseTopic('customer:order:12345')).toEqual({ kind: 'customer-order', orderId: '12345' });
  });

  it('parses merchant-store topic', () => {
    expect(parseTopic('merchant:store:99')).toEqual({ kind: 'merchant-store', storeId: '99' });
  });

  it('parses rider-hall topic', () => {
    expect(parseTopic('rider:hall:BJ-110')).toEqual({ kind: 'rider-hall', cityCode: 'BJ-110' });
  });

  it('parses admin-dispatch topic', () => {
    expect(parseTopic('admin:dispatch')).toEqual({ kind: 'admin-dispatch' });
  });

  it('rejects invalid topic format', () => {
    expect(parseTopic('foo:bar')).toBeNull();
    expect(parseTopic('')).toBeNull();
    expect(parseTopic('customer:order:abc')).toBeNull();
  });

  it('scope gate — customer cannot subscribe merchant-store', () => {
    const parsed = parseTopic('merchant:store:1')!;
    expect(isScopeAllowedForTopic('customer', parsed)).toBe(false);
    expect(isScopeAllowedForTopic('merchant', parsed)).toBe(true);
    expect(isScopeAllowedForTopic('admin', parsed)).toBe(true);
  });

  it('TopicBuilder produces canonical strings', () => {
    expect(TopicBuilder.customerOrder('77')).toBe('customer:order:77');
    expect(TopicBuilder.merchantStore(5)).toBe('merchant:store:5');
    expect(TopicBuilder.riderHall('SH-1')).toBe('rider:hall:SH-1');
    expect(TopicBuilder.adminDispatch()).toBe('admin:dispatch');
  });
});

describe('WsGateway — connect + subscribe', () => {
  let gateway: WsGateway;
  let auth: AuthService;
  let foodRepo: { findOne: jest.Mock };

  const jwtForTest = new JwtService({ secret: 'customer-secret' });

  beforeAll(async () => {
    foodRepo = { findOne: jest.fn() };

    const authMock: Partial<AuthService> = {
      verify: jest.fn((token: string, scope) => {
        // 仅当 token === valid-<scope> 才放行
        if (token === `valid-${scope}`) {
          return { sub: 'u-1', scope, roles: [], jti: 't1', exp: 0 };
        }
        throw new Error('invalid token');
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WsGateway,
        { provide: AuthService, useValue: authMock },
        { provide: getRepositoryToken(FoodOrder), useValue: foodRepo },
        { provide: getRepositoryToken(ErrandOrder), useValue: { findOne: jest.fn().mockResolvedValue(null) } },
        { provide: getRepositoryToken(Store), useValue: { findOne: jest.fn().mockResolvedValue(null) } },
        { provide: getRepositoryToken(RiderTask), useValue: { findOne: jest.fn().mockResolvedValue(null) } },
        { provide: getRepositoryToken(RiderAccount), useValue: { findOne: jest.fn().mockResolvedValue(null) } },
      ],
    }).compile();

    gateway = moduleRef.get(WsGateway);
    auth = moduleRef.get(AuthService);
    // unused jwt instance to keep imports honest
    void jwtForTest;
    void auth;
  });

  it('disconnects when token missing', async () => {
    const sock = makeSocket({ scope: 'customer' });
    await gateway.handleConnection(sock as never);
    expect(sock.disconnect).toHaveBeenCalled();
    expect(sock.data.principal).toBeUndefined();
  });

  it('disconnects when token invalid', async () => {
    const sock = makeSocket({ token: 'garbage', scope: 'customer' });
    await gateway.handleConnection(sock as never);
    expect(sock.disconnect).toHaveBeenCalled();
  });

  it('disconnects when scope param invalid', async () => {
    const sock = makeSocket({ token: 'valid-customer', scope: 'hacker' });
    await gateway.handleConnection(sock as never);
    expect(sock.disconnect).toHaveBeenCalled();
  });

  it('attaches principal on valid handshake', async () => {
    const sock = makeSocket({ token: 'valid-customer', scope: 'customer' });
    await gateway.handleConnection(sock as never);
    expect(sock.disconnect).not.toHaveBeenCalled();
    expect(sock.data.principal).toMatchObject({ scope: 'customer', principalId: 'u-1' });
  });

  it('subscribe rejects topic for wrong scope', async () => {
    const sock = makeSocket({ token: 'valid-customer', scope: 'customer' });
    await gateway.handleConnection(sock as never);
    const ack = await gateway.onSubscribe(sock as never, { topic: 'admin:dispatch' });
    expect(ack.ok).toBe(false);
    expect(ack.reason).toBe('scope-forbidden');
  });

  it('subscribe rejects topic when ownership fails', async () => {
    foodRepo.findOne.mockResolvedValue(null);
    const sock = makeSocket({ token: 'valid-customer', scope: 'customer' });
    await gateway.handleConnection(sock as never);
    const ack = await gateway.onSubscribe(sock as never, { topic: 'customer:order:9999' });
    expect(ack.ok).toBe(false);
    expect(ack.reason).toBe('not-owner');
  });

  it('subscribe accepts topic when customer owns the order', async () => {
    foodRepo.findOne.mockResolvedValueOnce({ foodOrderId: '1', customerId: 'u-1' });
    const sock = makeSocket({ token: 'valid-customer', scope: 'customer' });
    await gateway.handleConnection(sock as never);
    const ack = await gateway.onSubscribe(sock as never, { topic: 'customer:order:1' });
    expect(ack.ok).toBe(true);
    expect(sock.join).toHaveBeenCalledWith('customer:order:1');
  });

  it('subscribe rejects invalid topic format', async () => {
    const sock = makeSocket({ token: 'valid-customer', scope: 'customer' });
    await gateway.handleConnection(sock as never);
    const ack = await gateway.onSubscribe(sock as never, { topic: 'not-a-topic' });
    expect(ack.ok).toBe(false);
    expect(ack.reason).toBe('topic-invalid');
  });
});
