import { resolve } from 'node:path';

import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

// 优先加载根 .env(monorepo 唯一来源)
dotenv.config({ path: resolve(__dirname, '../../../../.env') });
dotenv.config({ path: resolve(__dirname, '../../../.env') });

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: Number(process.env.MYSQL_PORT ?? 3307),
  username: process.env.MYSQL_USER ?? 'o2o',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE ?? 'o2o',
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
  charset: 'utf8mb4',
  timezone: '+08:00',
  entities: [resolve(__dirname, 'entities/*.entity.{ts,js}')],
  migrations: [resolve(__dirname, 'migrations/*.{ts,js}')],
});

export default AppDataSource;
