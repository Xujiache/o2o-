import { Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Raw } from '../../common/decorators/raw-response.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { type AiConversationVo, type AiMessageVo, StreamChatDto } from './customer-ai-chat.dto';
import { CustomerAiChatService } from './customer-ai-chat.service';

@ApiTags('customer-ai-chat')
@Controller('c/ai')
@UseGuards(CustomerJwtGuard)
@ApiBearerAuth('Customer-Token')
export class CustomerAiChatController {
  constructor(private readonly service: CustomerAiChatService) {}

  /** 列出我的对话(按更新时间倒序,最多 50) */
  @Get('conversations')
  @ApiOperation({ summary: '我的对话列表(云端同步)' })
  async listConversations(@CurrentUser() p: CurrentPrincipal): Promise<{ list: AiConversationVo[] }> {
    const list = await this.service.listConversations(p.principalId);
    return { list };
  }

  /** 自动 resolve(找或建)当前 productId 的活跃会话 */
  @Get('conversations/resolve')
  @ApiOperation({ summary: '按 productId 找或建当前活跃会话(进入页面时调)' })
  async resolveConversation(
    @CurrentUser() p: CurrentPrincipal,
    @Query('productId') productId?: string,
    @Query('productName') productName?: string,
  ): Promise<AiConversationVo> {
    const c = await this.service.resolveConversation({
      customerId: p.principalId,
      productId,
      productName,
    });
    return {
      conversationId: String(c._id),
      productId: c.productId,
      productName: c.productName,
      title: c.title,
      lastPreview: c.lastPreview,
      messageCount: c.messageCount,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  /** 拉某个会话的全部消息(进入页面时) */
  @Get('conversations/:id/messages')
  @ApiOperation({ summary: '拉某会话的全部历史消息' })
  async listMessages(@CurrentUser() p: CurrentPrincipal, @Param('id') id: string): Promise<{ list: AiMessageVo[] }> {
    const list = await this.service.listMessages(p.principalId, id);
    return { list };
  }

  /** 重置:归档当前会话,下次自动新建 */
  @Delete('conversations/:id')
  @ApiOperation({ summary: '归档(软删)某会话,前端"重置对话"按钮调' })
  async archive(@CurrentUser() p: CurrentPrincipal, @Param('id') id: string): Promise<{ ok: boolean }> {
    await this.service.archiveConversation(p.principalId, id);
    return { ok: true };
  }

  /**
   * SSE 流式对话端点(写库 + 推流)。
   * 事件:conversation(首条返 convoId)→ mode → delta×N → done | error
   */
  @Post('chat')
  @Raw()
  @ApiOperation({ summary: 'AI 商品咨询对话(SSE 流式 + 云端同步)' })
  async chat(@CurrentUser() p: CurrentPrincipal, @Body() dto: StreamChatDto, @Res() res: Response): Promise<void> {
    res.setHeader('content-type', 'text/event-stream; charset=utf-8');
    res.setHeader('cache-control', 'no-cache, no-transform');
    res.setHeader('connection', 'keep-alive');
    res.setHeader('x-accel-buffering', 'no');
    res.setHeader('content-encoding', 'identity');
    res.flushHeaders?.();
    // 关闭 Nagle 算法,让每个 chunk 立刻进 socket(否则小包会被 OS/TCP 攒到 ~40ms)
    res.socket?.setNoDelay(true);

    try {
      for await (const ev of this.service.stream({
        customerId: p.principalId,
        conversationId: dto.conversationId,
        productId: dto.productId,
        productName: dto.productName,
        message: dto.message,
      })) {
        const data = ev.data.replace(/\n/g, '\\n');
        res.write(`event: ${ev.type}\ndata: ${data}\n\n`);
        // 兼容 compression 包装下的 flush
        (res as Response & { flush?: () => void }).flush?.();
        // 让事件循环跑一圈,确保 socket 真把字节送到内核 buffer
        await new Promise<void>((r) => setImmediate(r));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.write(`event: error\ndata: ${msg.slice(0, 256)}\n\n`);
    } finally {
      res.end();
    }
  }
}
