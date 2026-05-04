import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { type RedisOptions } from 'ioredis';

import type { AppConfig } from './configuration';

/** 注入 Redis 客户端的 Token */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const r = config.get<AppConfig['redis']>('redis');
        if (!r) throw new Error('redis config missing');
        const opts: RedisOptions = {
          host: r.host,
          port: r.port,
          db: r.db,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
        };
        if (r.password) opts.password = r.password;
        const client = new Redis(opts);
        const logger = new Logger('Redis');
        client.on('connect', () => logger.log(`connected to ${r.host}:${r.port}`));
        client.on('error', (err) => logger.error({ err }, `redis error: ${err.message}`));
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}
  async onApplicationShutdown(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }
}
