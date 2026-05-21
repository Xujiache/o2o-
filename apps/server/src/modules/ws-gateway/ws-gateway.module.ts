import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ErrandOrder } from '../../database/entities/errand-order.entity';
import { FoodOrder } from '../../database/entities/food-order.entity';
import { RiderAccount } from '../../database/entities/rider-account.entity';
import { RiderTask } from '../../database/entities/rider-task.entity';
import { Store } from '../../database/entities/store.entity';
// AuthModule 是 @Global,无需 import

import { WsEventBridgeService } from './ws-event-bridge.service';
import { WsGateway } from './ws.gateway';

/**
 * WS Gateway 模块 — 4 端统一 WebSocket 推送。
 *
 * 端点:`/v1` namespace(socket.io 默认 path `/socket.io`)
 * 握手:`?token=<scope-token>&scope=<customer|merchant|rider|admin>`
 * 心跳:pingInterval=25s, pingTimeout=60s(socket.io 内置)
 */
@Module({
  imports: [TypeOrmModule.forFeature([FoodOrder, ErrandOrder, Store, RiderTask, RiderAccount])],
  providers: [WsGateway, WsEventBridgeService],
  exports: [WsGateway],
})
export class WsGatewayModule {}
