/**
 * DomainEventBus — 进程内同步事件总线 + domain_event 表持久化 + 失败重试 hook。
 *
 * 设计:
 *   - publish 总是先落表 status=pending → 触发 emitAsync → 成功 status=done,失败 status=retrying
 *   - 订阅器抛错被 bus 捕获(不阻塞业务流);DomainEventRetryJob 兜底
 *   - 后续可换 RabbitMQ/Kafka 实现:实现 DomainEventBusContract 接口替换即可
 */
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { nanoid } from 'nanoid';
import { Repository } from 'typeorm';

import { DomainEvent } from '../database/entities';

import type { EventName, EventPayloadMap } from './events';

const RETRY_BACKOFF_BASE_MS = 60_000;

export interface PublishContext {
  bizType: string;
  bizId?: string | null;
}

export interface DomainEventBusContract {
  publish<K extends EventName>(
    name: K,
    payload: EventPayloadMap[K],
    context: PublishContext,
  ): Promise<{ eventId: string }>;
}

@Injectable()
export class DomainEventBus implements DomainEventBusContract {
  private readonly logger = new Logger(DomainEventBus.name);

  constructor(
    private readonly emitter: EventEmitter2,
    @InjectRepository(DomainEvent) private readonly repo: Repository<DomainEvent>,
  ) {}

  async publish<K extends EventName>(
    name: K,
    payload: EventPayloadMap[K],
    context: PublishContext,
  ): Promise<{ eventId: string }> {
    const eventId = `${name}-${Date.now()}-${nanoid(8)}`;
    const now = Date.now();

    const row = this.repo.create({
      eventId,
      bizType: context.bizType,
      bizId: context.bizId ?? null,
      payload: payload as unknown as DomainEvent['payload'],
      status: 'pending',
      retryCount: 0,
      createdAt: String(now),
      updatedAt: String(now),
    });
    await this.repo.save(row);

    return this.dispatch(eventId, name, payload, 0);
  }

  /**
   * 内部方法:供 retry job 复用 — 已落表的事件再次触发订阅器。
   */
  async dispatch<K extends EventName>(
    eventId: string,
    name: K,
    payload: EventPayloadMap[K],
    currentRetryCount: number,
  ): Promise<{ eventId: string }> {
    await this.repo.update({ eventId }, { status: 'processing', updatedAt: String(Date.now()) });

    try {
      await this.emitter.emitAsync(name, payload);
      await this.repo.update(
        { eventId },
        { status: 'done', errorMessage: null, nextRetryAt: null, updatedAt: String(Date.now()) },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const next = Date.now() + RETRY_BACKOFF_BASE_MS * 2 ** currentRetryCount;
      await this.repo.update(
        { eventId },
        {
          status: 'retrying',
          retryCount: currentRetryCount + 1,
          errorMessage: msg.slice(0, 1024),
          nextRetryAt: String(next),
          updatedAt: String(Date.now()),
        },
      );
      this.logger.error(`[${name}] subscriber failed: ${msg}; will retry`);
    }

    return { eventId };
  }
}
