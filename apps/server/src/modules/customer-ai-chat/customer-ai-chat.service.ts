import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { Repository } from 'typeorm';

import { decryptSecret } from '../../common/utils/cipher.util';
import { GroceryProduct, ThirdPartyConfig, TraceabilityArchive } from '../../database/entities';
import {
  type ChatMessage,
  type DeepSeekAdapter,
  type DeepSeekConfig,
  DeepSeekMockAdapter,
  DeepSeekRealAdapter,
} from '../integration-gateway/adapters/deepseek.adapter';

import type { AiConversationVo, AiMessageVo } from './customer-ai-chat.dto';
import { AiConversation, type AiConversationDocument } from './schemas/ai-conversation.schema';
import { AiMessage, type AiMessageDocument } from './schemas/ai-message.schema';

const PROVIDER = 'ai-deepseek';

@Injectable()
export class CustomerAiChatService {
  private readonly logger = new Logger(CustomerAiChatService.name);

  constructor(
    @InjectRepository(ThirdPartyConfig) private readonly cfgRepo: Repository<ThirdPartyConfig>,
    @InjectRepository(GroceryProduct) private readonly prodRepo: Repository<GroceryProduct>,
    @InjectRepository(TraceabilityArchive) private readonly archRepo: Repository<TraceabilityArchive>,
    @InjectModel(AiConversation.name) private readonly convoModel: Model<AiConversationDocument>,
    @InjectModel(AiMessage.name) private readonly msgModel: Model<AiMessageDocument>,
    private readonly config: ConfigService,
  ) {
    void this.config; // reserved
  }

  // ============ Adapter 解析(独立 DB 开关,不依赖 INTEGRATION_MODE)============

  private async resolveAdapter(): Promise<{ adapter: DeepSeekAdapter; mode: 'mock' | 'real' }> {
    const env = process.env.NODE_ENV ?? 'development';
    const row = await this.cfgRepo.findOne({ where: { provider: PROVIDER, env } });
    if (!row || row.status !== 'active' || !row.encryptedSecret) {
      return { adapter: new DeepSeekMockAdapter(), mode: 'mock' };
    }
    try {
      const plain = decryptSecret(row.encryptedSecret ?? '');
      if (!plain) return { adapter: new DeepSeekMockAdapter(), mode: 'mock' };
      let parsed: DeepSeekConfig;
      const trimmed = plain.trim();
      if (trimmed.startsWith('{')) {
        parsed = JSON.parse(trimmed) as DeepSeekConfig;
      } else {
        parsed = { apiKey: trimmed };
      }
      if (!parsed.apiKey) return { adapter: new DeepSeekMockAdapter(), mode: 'mock' };
      return { adapter: new DeepSeekRealAdapter(parsed), mode: 'real' };
    } catch (err) {
      this.logger.warn({ err }, '[ai-chat] secret parse failed → mock');
      return { adapter: new DeepSeekMockAdapter(), mode: 'mock' };
    }
  }

  private async buildSystemPrompt(productId: string | undefined): Promise<string> {
    const base = [
      '你是 O2O 平台自营生鲜商城的 AI 食材顾问。',
      '专长:做法推荐、营养价值、搭配建议、储存方法、季节性、人群适宜。',
      '回答务必简洁、结构化(用列表/小标题),避免大段长文。',
      '回答用纯中文,不要中英夹杂。',
      '不要回答与食材/烹饪/营养无关的问题,礼貌引导用户回到主题。',
    ].join('\n');
    if (!productId) return base;
    const product = await this.prodRepo.findOne({ where: { productId } });
    if (!product) return base;
    const ctx: string[] = [
      `\n当前用户正在咨询商品「${product.name}」:`,
      `- 描述:${product.description ?? '(无)'}`,
      `- 单价:${(Number(product.unitPriceCentsPerJin) / 100).toFixed(2)} 元 / 斤`,
      `- 计价方式:${product.pricedBy === 'weight' ? '按斤称重' : product.pricedBy === 'piece' ? '按件计件' : 'SKU 规格定价'}`,
    ];
    if (product.hasTraceability === 1) {
      const arch = await this.archRepo
        .createQueryBuilder('a')
        .where('a.status = :s', { s: 'active' })
        .orderBy('a.createdAt', 'DESC')
        .getOne();
      if (arch) {
        ctx.push(`- 支持一物一码溯源(养殖基地:${arch.farmName ?? '——'} / 饲料:${arch.feedType ?? '——'})`);
      }
    }
    return base + ctx.join('\n');
  }

  // ============ 会话 CRUD ============

  /** 找或建当前 customer+productId 的活跃会话 */
  async resolveConversation(input: {
    customerId: string;
    productId?: string;
    productName?: string;
  }): Promise<AiConversationDocument> {
    const filter: Record<string, unknown> = { customerId: input.customerId, status: 'active' };
    if (input.productId) filter.productId = input.productId;
    else filter.productId = { $exists: false };

    let convo = await this.convoModel.findOne(filter).exec();
    if (convo) return convo;

    const now = Date.now();
    convo = await this.convoModel.create({
      customerId: input.customerId,
      productId: input.productId,
      productName: input.productName,
      title: undefined,
      lastPreview: undefined,
      messageCount: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    return convo;
  }

  async listConversations(customerId: string): Promise<AiConversationVo[]> {
    const docs = await this.convoModel
      .find({ customerId, status: 'active' })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean()
      .exec();
    return docs.map((d) => this.toConvoVo(d));
  }

  async getConversation(customerId: string, conversationId: string): Promise<AiConversationVo> {
    const doc = await this.convoModel.findOne({ _id: conversationId, customerId }).lean().exec();
    if (!doc) throw new NotFoundException('conversation not found');
    return this.toConvoVo(doc);
  }

  async listMessages(customerId: string, conversationId: string): Promise<AiMessageVo[]> {
    // 鉴权:确保此 conversation 属于当前用户
    const convo = await this.convoModel.findOne({ _id: conversationId, customerId }).lean().exec();
    if (!convo) throw new NotFoundException('conversation not found');

    const msgs = await this.msgModel.find({ conversationId }).sort({ createdAt: 1 }).limit(500).lean().exec();
    return msgs.map((m) => ({
      messageId: String(m._id),
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));
  }

  /** 软删除(归档),后续对话会新建 */
  async archiveConversation(customerId: string, conversationId: string): Promise<void> {
    const r = await this.convoModel.updateOne(
      { _id: conversationId, customerId, status: 'active' },
      { $set: { status: 'archived', updatedAt: Date.now() } },
    );
    if (r.matchedCount === 0) throw new NotFoundException('conversation not found');
  }

  private toConvoVo(d: {
    _id: unknown;
    productId?: string;
    productName?: string;
    title?: string;
    lastPreview?: string;
    messageCount: number;
    createdAt: number;
    updatedAt: number;
  }): AiConversationVo {
    return {
      conversationId: String(d._id),
      productId: d.productId,
      productName: d.productName,
      title: d.title,
      lastPreview: d.lastPreview,
      messageCount: d.messageCount,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  // ============ 流式对话(写库 + SSE)============

  /**
   * 主入口:返回 async iterable,每个 chunk 是 { type, data }。
   * controller 接 SSE 输出;同时在流结束时自动把 user+assistant 完整消息持久化。
   */
  async *stream(input: {
    customerId: string;
    conversationId?: string;
    productId?: string;
    productName?: string;
    message: string;
  }): AsyncIterable<{ type: 'mode' | 'conversation' | 'delta' | 'done' | 'error'; data: string }> {
    // 1. resolve 会话
    let convoId = input.conversationId;
    if (convoId) {
      const exist = await this.convoModel.findOne({ _id: convoId, customerId: input.customerId }).exec();
      if (!exist) {
        // 提供了不存在的 conversationId → 退化到 auto-resolve
        convoId = undefined;
      }
    }
    if (!convoId) {
      const convo = await this.resolveConversation({
        customerId: input.customerId,
        productId: input.productId,
        productName: input.productName,
      });
      convoId = String(convo._id);
    }
    yield { type: 'conversation', data: convoId };

    // 2. 拉历史(最近 20 条,够 system + 当前 message 用)
    const history = await this.msgModel
      .find({ conversationId: convoId })
      .sort({ createdAt: 1 })
      .limit(40)
      .lean()
      .exec();

    // 3. resolve adapter + 模式
    const { adapter, mode } = await this.resolveAdapter();
    yield { type: 'mode', data: mode };

    // 4. 系统提示
    const system = await this.buildSystemPrompt(input.productId);
    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      ...history.slice(-16).map<ChatMessage>((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: input.message },
    ];

    // 5. 立刻先存 user message(确保即使中断也有记录)
    const nowUser = Date.now();
    await this.msgModel.create({
      conversationId: convoId,
      customerId: input.customerId,
      role: 'user',
      content: input.message,
      createdAt: nowUser,
    });

    // 6. 调适配器 stream + 累积 assistant 全文
    let full = '';
    try {
      for await (const delta of adapter.streamChat(messages)) {
        full += delta;
        yield { type: 'delta', data: delta };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error({ err }, `[ai-chat] stream failed: ${msg}`);
      yield { type: 'error', data: msg.slice(0, 256) };
      // 即使失败也存已生成部分(让用户在历史里看到痕迹)
      if (full) {
        await this.persistAssistantAndUpdateConvo(convoId, input.customerId, full, input.message);
      }
      return;
    }

    // 7. 存 assistant message + 更新 conversation 摘要
    await this.persistAssistantAndUpdateConvo(convoId, input.customerId, full, input.message);
    yield { type: 'done', data: '' };
  }

  private async persistAssistantAndUpdateConvo(
    convoId: string,
    customerId: string,
    assistantContent: string,
    userContent: string,
  ): Promise<void> {
    const now = Date.now();
    await this.msgModel.create({
      conversationId: convoId,
      customerId,
      role: 'assistant',
      content: assistantContent,
      createdAt: now,
    });
    // 更新会话:title(首次)+ lastPreview + messageCount + updatedAt
    const convo = await this.convoModel.findById(convoId).exec();
    if (convo) {
      if (!convo.title) {
        convo.title = userContent.length > 24 ? userContent.slice(0, 24) + '…' : userContent;
      }
      convo.lastPreview = assistantContent.length > 60 ? assistantContent.slice(0, 60) + '…' : assistantContent;
      convo.messageCount = (convo.messageCount ?? 0) + 2; // user + assistant
      convo.updatedAt = now;
      await convo.save();
    }
  }
}
