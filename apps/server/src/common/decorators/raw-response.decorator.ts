import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE = 'RAW_RESPONSE';

/** 跳过 ResponseInterceptor 的统一 ApiResponse 包装(用于文件流/302/SSE) */
export const Raw = (): MethodDecorator & ClassDecorator => SetMetadata(RAW_RESPONSE, true);
