import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    bodyParser: true,
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.use(compression());

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (process.env.SWAGGER_ENABLED !== 'false') {
    const swaggerPath = process.env.SWAGGER_PATH ?? 'api-docs';
    const builder = new DocumentBuilder()
      .setTitle('O2O Platform API')
      .setDescription('外卖 + 跑腿 — 4 端共享后端 / Token 严格隔离')
      .setVersion('v1')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'Customer-Token' }, 'Customer-Token')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'Merchant-Token' }, 'Merchant-Token')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'Rider-Token' }, 'Rider-Token')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'Admin-Token' }, 'Admin-Token')
      .build();
    const document = SwaggerModule.createDocument(app, builder);
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.info(`[o2o] server listening on :${port} (env=${process.env.NODE_ENV ?? 'development'})`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[o2o] bootstrap failed:', err);
  process.exit(1);
});
