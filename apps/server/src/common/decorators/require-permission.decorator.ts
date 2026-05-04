import { SetMetadata } from '@nestjs/common';

export const PERMISSION_META = 'PERMISSION_META';

/**
 * 权限要求装饰器 — T09 实现 PermissionGuard 后生效。
 *
 * ```ts
 * @RequirePermission('admin:audit:logs:view')
 * @Get('audit-logs')
 * list() { ... }
 * ```
 */
export const RequirePermission = (...codes: string[]): MethodDecorator => SetMetadata(PERMISSION_META, codes);
