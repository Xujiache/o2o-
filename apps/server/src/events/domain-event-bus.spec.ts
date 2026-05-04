import { EventEmitter2 } from '@nestjs/event-emitter';

import type { DomainEvent } from '../database/entities';

import { DomainEventBus } from './domain-event-bus';
import {
  type AuditLogCreatedPayload,
  type ConfigChangedPayload,
  EventName,
  type FileUploadedPayload,
  type PermissionChangedPayload,
  type ThirdPartyCallbackReceivedPayload,
} from './events';

class InMemoryRepo {
  rows = new Map<string, Partial<DomainEvent>>();

  create = jest.fn((data: Partial<DomainEvent>): Partial<DomainEvent> => ({ ...data }));

  save = jest.fn(async (data: Partial<DomainEvent>): Promise<Partial<DomainEvent>> => {
    this.rows.set(String(data.eventId), { ...data });
    return { ...data };
  });

  update = jest.fn(async (where: { eventId: string }, patch: Partial<DomainEvent>): Promise<{ affected: number }> => {
    const cur = this.rows.get(where.eventId);
    if (cur) this.rows.set(where.eventId, { ...cur, ...patch });
    return { affected: 1 };
  });
}

function buildBus() {
  const emitter = new EventEmitter2();
  const repo = new InMemoryRepo();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bus = new DomainEventBus(emitter, repo as any);
  return { bus, emitter, repo };
}

describe('DomainEventBus', () => {
  it('Stage 0 五类事件 publish 后落表 + 触发对应订阅器', async () => {
    const { bus, emitter, repo } = buildBus();
    const stage0Events = [
      EventName.ConfigChanged,
      EventName.PermissionChanged,
      EventName.FileUploaded,
      EventName.ThirdPartyCallbackReceived,
      EventName.AuditLogCreated,
    ];
    const calls: Array<{ name: string; payload: unknown }> = [];
    for (const ev of stage0Events) {
      emitter.on(ev, (p) => calls.push({ name: ev, payload: p }));
    }

    const cfg: ConfigChangedPayload = { configKey: 'k', oldValue: 'a', newValue: 'b', operator: 'sys' };
    const perm: PermissionChangedPayload = { roleId: 'R1', permissionId: 'P1', action: 'grant' };
    const file: FileUploadedPayload = { fileId: 'f1', bizType: 'avatar', ownerType: 'customer', ownerId: '10001' };
    const cb: ThirdPartyCallbackReceivedPayload = { provider: 'wxpay', callbackId: 'cb1', status: 'SUCCESS', raw: {} };
    const audit: AuditLogCreatedPayload = { auditLogId: '1', traceId: 't1', targetType: 'file', targetId: 'f1' };

    await bus.publish(EventName.ConfigChanged, cfg, { bizType: EventName.ConfigChanged });
    await bus.publish(EventName.PermissionChanged, perm, { bizType: EventName.PermissionChanged });
    await bus.publish(EventName.FileUploaded, file, { bizType: EventName.FileUploaded });
    await bus.publish(EventName.ThirdPartyCallbackReceived, cb, { bizType: EventName.ThirdPartyCallbackReceived });
    await bus.publish(EventName.AuditLogCreated, audit, { bizType: EventName.AuditLogCreated });

    expect(calls).toHaveLength(5);
    expect(calls.map((c) => c.name).sort()).toEqual([...stage0Events].sort());
    expect(repo.rows.size).toBe(5);
    for (const row of repo.rows.values()) {
      expect(row.status).toBe('done');
      expect(row.errorMessage).toBeNull();
    }
  });

  it('订阅器抛错 → status=retrying + retryCount=1 + nextRetryAt 设置', async () => {
    const { bus, emitter, repo } = buildBus();
    emitter.on(EventName.FileUploaded, () => {
      throw new Error('thumbnail SDK exploded');
    });
    const file: FileUploadedPayload = { fileId: 'f2', bizType: 'avatar', ownerType: 'rider', ownerId: '30001' };
    const { eventId } = await bus.publish(EventName.FileUploaded, file, { bizType: EventName.FileUploaded });
    const row = repo.rows.get(eventId)!;
    expect(row.status).toBe('retrying');
    expect(row.retryCount).toBe(1);
    expect(row.errorMessage).toBe('thumbnail SDK exploded');
    expect(row.nextRetryAt).toBeDefined();
    expect(Number(row.nextRetryAt)).toBeGreaterThan(Date.now());
  });

  it('dispatch 重试成功后 status=done', async () => {
    const { bus, emitter, repo } = buildBus();
    let shouldFail = true;
    emitter.on(EventName.FileUploaded, () => {
      if (shouldFail) throw new Error('first attempt fails');
    });

    const file: FileUploadedPayload = { fileId: 'f3', bizType: 'avatar', ownerType: 'merchant', ownerId: '20001' };
    const { eventId } = await bus.publish(EventName.FileUploaded, file, { bizType: EventName.FileUploaded });
    expect(repo.rows.get(eventId)!.status).toBe('retrying');

    shouldFail = false;
    await bus.dispatch(eventId, EventName.FileUploaded, file, 1);
    const row = repo.rows.get(eventId)!;
    expect(row.status).toBe('done');
    expect(row.errorMessage).toBeNull();
    expect(row.nextRetryAt).toBeNull();
  });
});
