import { Inject, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Scope } from '@o2o/contracts';
import type { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';

import { ErrandOrder } from '../../database/entities/errand-order.entity';
import { FoodOrder } from '../../database/entities/food-order.entity';
import { RiderAccount } from '../../database/entities/rider-account.entity';
import { RiderTask } from '../../database/entities/rider-task.entity';
import { Store } from '../../database/entities/store.entity';
import { AuthService } from '../auth/auth.service';

import { isScopeAllowedForTopic, parseTopic } from './ws-topic.util';

interface WsPrincipal {
  scope: Scope;
  principalId: string;
  roles: string[];
}

interface SubscribePayload {
  topic: string;
}

interface SocketData {
  principal: WsPrincipal;
}

/**
 * 4 端统一 WebSocket 网关。
 *
 * - 端点:`/ws/v1`(socket.io 默认 path `/socket.io`,namespace=`/v1`)
 * - 握手:`?token=<scope-token>&scope=<customer|merchant|rider|admin>`
 * - 心跳:`pingInterval=25s, pingTimeout=60s`(socket.io 内置)
 */
@WebSocketGateway({
  namespace: '/v1',
  cors: { origin: true, credentials: true },
  pingInterval: 25_000,
  pingTimeout: 60_000,
  transports: ['websocket', 'polling'],
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(forwardRef(() => AuthService)) private readonly authService: AuthService,
    @InjectRepository(FoodOrder) private readonly foodOrderRepo: Repository<FoodOrder>,
    @InjectRepository(ErrandOrder) private readonly errandOrderRepo: Repository<ErrandOrder>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(RiderTask) private readonly riderTaskRepo: Repository<RiderTask>,
    @InjectRepository(RiderAccount) private readonly riderAccountRepo: Repository<RiderAccount>,
  ) {}

  /** 握手 — 校验 token+scope */
  async handleConnection(client: Socket): Promise<void> {
    const token = String(client.handshake.query.token ?? '');
    const scope = String(client.handshake.query.scope ?? '') as Scope;
    if (!token || !['customer', 'merchant', 'rider', 'admin'].includes(scope)) {
      this.logger.warn(`[ws] connect missing token/scope sid=${client.id}`);
      this.disconnectWithCode(client, 4401, 'token-or-scope-missing');
      return;
    }
    try {
      const payload = this.authService.verify(token, scope);
      if (payload.scope !== scope) {
        this.disconnectWithCode(client, 4401, 'scope-mismatch');
        return;
      }
      (client.data as SocketData).principal = {
        scope,
        principalId: payload.sub,
        roles: payload.roles ?? [],
      };
      this.logger.log(`[ws] connect ok sid=${client.id} scope=${scope} pid=${payload.sub}`);
    } catch (err) {
      this.logger.warn(`[ws] connect verify fail sid=${client.id} err=${(err as Error).message}`);
      this.disconnectWithCode(client, 4401, 'token-invalid');
    }
  }

  handleDisconnect(client: Socket): void {
    const principal = (client.data as SocketData).principal;
    this.logger.debug(`[ws] disconnect sid=${client.id} pid=${principal?.principalId ?? '-'}`);
  }

  /** 订阅 topic — 异步权限校验通过则 join + ack {ok:true} */
  @SubscribeMessage('subscribe')
  async onSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SubscribePayload,
  ): Promise<{ ok: boolean; topic?: string; reason?: string }> {
    const principal = (client.data as SocketData).principal;
    if (!principal) return { ok: false, reason: 'not-authed' };
    const topic = body?.topic;
    if (!topic) return { ok: false, reason: 'topic-required' };

    const parsed = parseTopic(topic);
    if (!parsed) return { ok: false, topic, reason: 'topic-invalid' };
    if (!isScopeAllowedForTopic(principal.scope, parsed)) {
      return { ok: false, topic, reason: 'scope-forbidden' };
    }

    try {
      const allowed = await this.checkOwnership(principal, parsed);
      if (!allowed) return { ok: false, topic, reason: 'not-owner' };
    } catch (err) {
      this.logger.warn(`[ws] subscribe ownership check failed: ${(err as Error).message}`);
      return { ok: false, topic, reason: 'check-failed' };
    }

    await client.join(topic);
    this.logger.debug(`[ws] subscribe sid=${client.id} topic=${topic}`);
    return { ok: true, topic };
  }

  @SubscribeMessage('unsubscribe')
  async onUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SubscribePayload,
  ): Promise<{ ok: boolean; topic?: string }> {
    const topic = body?.topic;
    if (!topic) return { ok: false };
    await client.leave(topic);
    return { ok: true, topic };
  }

  // === 服务端推送 helper ===

  /** 单 topic 广播 */
  emitToTopic(topic: string, type: string, data: unknown, traceId = ''): void {
    if (!this.server) return;
    this.server.to(topic).emit('event', {
      type,
      data,
      ts: Date.now(),
      traceId,
    });
  }

  /** 多 topic 同时广播(去重后逐一) */
  emitToTopics(topics: string[], type: string, data: unknown, traceId = ''): void {
    if (!this.server) return;
    const unique = Array.from(new Set(topics.filter(Boolean)));
    if (unique.length === 0) return;
    const payload = { type, data, ts: Date.now(), traceId };
    for (const t of unique) {
      this.server.to(t).emit('event', payload);
    }
  }

  // === 权限校验(异步、按需查库) ===

  private async checkOwnership(
    principal: WsPrincipal,
    parsed: NonNullable<ReturnType<typeof parseTopic>>,
  ): Promise<boolean> {
    if (principal.scope === 'admin') return true;
    switch (parsed.kind) {
      case 'customer-order': {
        if (principal.scope !== 'customer') return false;
        // 食物订单 + 跑腿订单 — 任一命中即放行
        const food = await this.foodOrderRepo
          .findOne({ where: { foodOrderId: parsed.orderId, customerId: principal.principalId } })
          .catch(() => null);
        if (food) return true;
        const errand = await this.errandOrderRepo
          .findOne({ where: { errandOrderId: parsed.orderId, customerId: principal.principalId } })
          .catch(() => null);
        return Boolean(errand);
      }
      case 'merchant-store': {
        if (principal.scope !== 'merchant') return false;
        const store = await this.storeRepo
          .findOne({ where: { storeId: parsed.storeId, merchantId: principal.principalId } })
          .catch(() => null);
        return Boolean(store);
      }
      case 'rider-hall': {
        if (principal.scope !== 'rider') return false;
        const rider = await this.riderAccountRepo
          .findOne({ where: { riderId: principal.principalId, accountStatus: 'active' } })
          .catch(() => null);
        // 已审核(approvedAt 非空)且 active
        return Boolean(rider && rider.approvedAt);
      }
      case 'rider-task': {
        if (principal.scope !== 'rider') return false;
        const task = await this.riderTaskRepo
          .findOne({ where: { riderTaskId: parsed.taskId, riderId: principal.principalId } })
          .catch(() => null);
        return Boolean(task);
      }
      case 'admin-dispatch':
        // admin 在函数入口已 return true;非 admin 不可订阅
        return false;
    }
  }

  private disconnectWithCode(client: Socket, code: number, reason: string): void {
    try {
      // socket.io 不直接暴露 close code,但保留语义到 reason
      client.emit('connect_error', { code, reason });
      client.disconnect(true);
    } catch {
      // ignore
    }
  }
}
