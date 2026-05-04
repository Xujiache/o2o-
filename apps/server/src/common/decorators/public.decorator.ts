import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'IS_PUBLIC';

/** 跳过 4 端 JWT 守卫(T09 接入)。Public 接口不强制 Token,但可选透传。 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC, true);
