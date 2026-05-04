/**
 * 应用配置加载 — 集中读取 .env 并做基本校验。
 * 后续 T07 会引入 TypeORM/Mongoose/ioredis,共用本配置。
 */
export default (): AppConfig => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    baseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
  },
  jwt: {
    customerSecret: process.env.JWT_CUSTOMER_SECRET ?? '',
    merchantSecret: process.env.JWT_MERCHANT_SECRET ?? '',
    riderSecret: process.env.JWT_RIDER_SECRET ?? '',
    adminSecret: process.env.JWT_ADMIN_SECRET ?? '',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '2h',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },
  mysql: {
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: Number(process.env.MYSQL_PORT ?? 3307),
    user: process.env.MYSQL_USER ?? 'o2o',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE ?? 'o2o',
  },
  redis: {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD ?? '',
    db: Number(process.env.REDIS_DB ?? 0),
  },
  mongo: {
    uri: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/o2o',
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER ?? 'minio',
    endpoint: process.env.MINIO_ENDPOINT ?? 'http://127.0.0.1:9000',
    region: process.env.MINIO_REGION ?? 'us-east-1',
    accessKey: process.env.MINIO_ACCESS_KEY ?? '',
    secretKey: process.env.MINIO_SECRET_KEY ?? '',
    bucket: process.env.MINIO_BUCKET ?? 'o2o-dev',
    publicBaseUrl: process.env.MINIO_PUBLIC_BASE_URL ?? 'http://127.0.0.1:9000',
  },
  integration: {
    mode: (process.env.INTEGRATION_MODE ?? 'mock') as 'mock' | 'real',
  },
  throttle: {
    ttl: Number(process.env.THROTTLE_DEFAULT_TTL ?? 60),
    limit: Number(process.env.THROTTLE_DEFAULT_LIMIT ?? 60),
  },
  log: {
    level: process.env.LOG_LEVEL ?? 'info',
    pretty: process.env.LOG_PRETTY === 'true',
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    path: process.env.SWAGGER_PATH ?? 'api-docs',
  },
  thirdPartySecretKey: process.env.THIRD_PARTY_SECRET_KEY ?? '',
});

export interface AppConfig {
  app: { env: string; port: number; baseUrl: string };
  jwt: {
    customerSecret: string;
    merchantSecret: string;
    riderSecret: string;
    adminSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  mysql: { host: string; port: number; user: string; password: string; database: string };
  redis: { host: string; port: number; password: string; db: number };
  mongo: { uri: string };
  storage: {
    provider: string;
    endpoint: string;
    region: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    publicBaseUrl: string;
  };
  integration: { mode: 'mock' | 'real' };
  throttle: { ttl: number; limit: number };
  log: { level: string; pretty: boolean };
  swagger: { enabled: boolean; path: string };
  thirdPartySecretKey: string;
}
