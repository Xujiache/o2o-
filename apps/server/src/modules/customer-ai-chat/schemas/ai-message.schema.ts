import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({ collection: 'ai_message', timestamps: false })
export class AiMessage {
  @Prop({ required: true, index: true }) conversationId!: string;
  @Prop({ required: true, index: true }) customerId!: string;
  @Prop({ required: true }) role!: 'user' | 'assistant';
  @Prop({ required: true }) content!: string;
  @Prop({ required: true }) createdAt!: number;
}

export type AiMessageDocument = HydratedDocument<AiMessage>;
export const AiMessageSchema = SchemaFactory.createForClass(AiMessage);
AiMessageSchema.index({ conversationId: 1, createdAt: 1 });
