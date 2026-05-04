import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import type { AppConfig } from '../../config/configuration';

import { AuthEntitiesModule } from './auth-entities.module';
import { AuthService } from './auth.service';
import { PermissionGuard } from './guards/permission.guard';
import {
  AdminJwtGuard,
  AnyScopeJwtGuard,
  CustomerJwtGuard,
  MerchantJwtGuard,
  RiderJwtGuard,
} from './guards/scope-jwt.guard';

@Global()
@Module({
  imports: [
    AuthEntitiesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const jwt = config.get<AppConfig['jwt']>('jwt');
        return {
          secret: jwt?.customerSecret ?? 'fallback',
          signOptions: { expiresIn: jwt?.accessTtl ?? '2h' },
        };
      },
    }),
  ],
  providers: [
    AuthService,
    CustomerJwtGuard,
    MerchantJwtGuard,
    RiderJwtGuard,
    AdminJwtGuard,
    AnyScopeJwtGuard,
    PermissionGuard,
  ],
  exports: [
    AuthService,
    CustomerJwtGuard,
    MerchantJwtGuard,
    RiderJwtGuard,
    AdminJwtGuard,
    AnyScopeJwtGuard,
    PermissionGuard,
  ],
})
export class AuthModule {}
