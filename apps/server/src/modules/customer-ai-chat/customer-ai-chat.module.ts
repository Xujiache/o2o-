import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GroceryProduct, ThirdPartyConfig, TraceabilityArchive } from '../../database/entities';

import { CustomerAiChatController } from './customer-ai-chat.controller';
import { CustomerAiChatService } from './customer-ai-chat.service';
import { AiConversation, AiConversationSchema } from './schemas/ai-conversation.schema';
import { AiMessage, AiMessageSchema } from './schemas/ai-message.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([ThirdPartyConfig, GroceryProduct, TraceabilityArchive]),
    MongooseModule.forFeature([
      { name: AiConversation.name, schema: AiConversationSchema },
      { name: AiMessage.name, schema: AiMessageSchema },
    ]),
  ],
  controllers: [CustomerAiChatController],
  providers: [CustomerAiChatService],
})
export class CustomerAiChatModule {}
