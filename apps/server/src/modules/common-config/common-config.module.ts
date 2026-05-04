import { Module } from '@nestjs/common';

/**
 * 系统参数模块占位 — sys_config 读写在 T13 之后接入
 * 提供 ConfigService 缓存 + 订阅 ConfigChanged 事件刷新
 */
@Module({})
export class CommonConfigModule {}
