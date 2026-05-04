import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import type { AppConfig } from './configuration';

/**
 * TypeORM(MySQL)模块 — 各业务模块用 `TypeOrmModule.forFeature([Entity])` 注册实体
 * 严禁 synchronize:true,所有 schema 变更走 migration(T08)。
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const m = config.get<AppConfig['mysql']>('mysql');
        if (!m) throw new Error('mysql config missing');
        return {
          type: 'mysql',
          host: m.host,
          port: m.port,
          username: m.user,
          password: m.password,
          database: m.database,
          synchronize: false,
          autoLoadEntities: true,
          logging: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'migration'] : ['error'],
          migrations: ['dist/database/migrations/*.js'],
          migrationsRun: false,
          timezone: '+08:00',
          charset: 'utf8mb4',
          extra: { connectionLimit: 10 },
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
