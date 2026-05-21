import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, Length, MaxLength, ValidateNested } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  content!: string;
}

export class StreamChatDto {
  /** 会话 ID — 不传则按 productId 自动 resume 或新建 */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  conversationId?: string;

  @ApiProperty({ required: false, description: '商品 ID — 同 customer 同 product 共用同一活跃会话' })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  productId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  productName?: string;

  @ApiProperty({ required: false, type: [ChatMessageDto], description: '客户端本地历史(可选,后端以云端为权威)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];

  @ApiProperty({ description: '当前用户消息' })
  @IsString()
  @Length(1, 2000)
  message!: string;
}

export interface AiConversationVo {
  conversationId: string;
  productId?: string;
  productName?: string;
  title?: string;
  lastPreview?: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface AiMessageVo {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}
