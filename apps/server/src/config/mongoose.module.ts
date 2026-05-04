import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule as NestMongooseModule } from '@nestjs/mongoose';

import type { AppConfig } from './configuration';

/**
 * Mongoose 模块 — 用于轨迹 / 操作日志 / 审计明细 / trace_log。
 * 业务子模块用 `MongooseModule.forFeature([{ name, schema }])` 注册集合。
 */
@Module({
  imports: [
    NestMongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const m = config.get<AppConfig['mongo']>('mongo');
        if (!m) throw new Error('mongo config missing');
        return {
          uri: m.uri,
          autoIndex: process.env.NODE_ENV !== 'production',
        };
      },
    }),
  ],
  exports: [NestMongooseModule],
})
export class MongooseModule {}
