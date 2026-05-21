import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/**
 * AI 对话会话(一个用户对一个商品共享一个会话,可被 reset 软删后开新)
 *
 * 索引:
 *   - { customerId: 1, productId: 1, status: 1 } 查"当前活跃会话"
 *   - { customerId: 1, updatedAt: -1 } 用户列表按时间倒排
 */
@Schema({ collection: 'ai_conversation', timestamps: false })
export class AiConversation {
  @Prop({ required: true, index: true }) customerId!: string;
  @Prop() productId?: string;
  @Prop() productName?: string;
  /** 用首条 user 消息截 24 字作为标题 */
  @Prop() title?: string;
  /** 最近一条助手消息的预览(列表展示用) */
  @Prop() lastPreview?: string;
  @Prop({ default: 0 }) messageCount!: number;
  /** active / archived(软删) */
  @Prop({ default: 'active', index: true }) status!: 'active' | 'archived';
  @Prop({ required: true }) createdAt!: number;
  @Prop({ required: true, index: true }) updatedAt!: number;
}

export type AiConversationDocument = HydratedDocument<AiConversation>;
export const AiConversationSchema = SchemaFactory.createForClass(AiConversation);
AiConversationSchema.index({ customerId: 1, productId: 1, status: 1 });
AiConversationSchema.index({ customerId: 1, updatedAt: -1 });
