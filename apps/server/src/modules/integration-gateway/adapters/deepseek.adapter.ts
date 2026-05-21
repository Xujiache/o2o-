/**
 * DeepSeek AI 对话 Adapter (OpenAI 兼容协议)
 *
 * - secret 是 JSON 字符串:`{ apiKey, baseUrl?, model? }`
 * - mock 模式:本地生成假回复并按字符流式 yield
 * - real 模式:走 DeepSeek HTTPS SSE,SSE chunk 解析返 delta
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface DeepSeekAdapter {
  /** 流式对话 — 异步迭代器,每个 yield 是一段增量文本 */
  streamChat(messages: ChatMessage[]): AsyncIterable<string>;
}

const DEFAULT_BASE = 'https://api.deepseek.com/v1';
const DEFAULT_MODEL = 'deepseek-chat';

/**
 * Mock 实现:基于最后一条 user 消息构造合理回复,逐字符 yield 模拟流式。
 * 不需要任何凭证,默认开发模式启用。
 */
export class DeepSeekMockAdapter implements DeepSeekAdapter {
  async *streamChat(messages: ChatMessage[]): AsyncIterable<string> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const userText = lastUser?.content ?? '你好';
    const systemHints = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');

    // 从 system prompt 里抽取商品名做拟人回复
    const productMatch = /商品[「【"]([^」】"]+)[」】"]/.exec(systemHints);
    const productName = productMatch?.[1] ?? '该食材';

    const reply = this.buildMockReply(productName, userText);
    // 30ms / 2~3 字模拟流式
    let i = 0;
    while (i < reply.length) {
      const step = 1 + Math.floor(Math.random() * 3);
      const chunk = reply.slice(i, i + step);
      i += step;
      yield chunk;
      await new Promise((r) => setTimeout(r, 30));
    }
  }

  private buildMockReply(productName: string, userText: string): string {
    const lower = userText.toLowerCase();
    if (lower.includes('做法') || lower.includes('怎么做') || lower.includes('菜谱')) {
      return [
        `${productName} 的经典做法推荐:`,
        ``,
        `**清炒做法**(15 分钟,适合上班族)`,
        `① 洗净切段,沥干`,
        `② 热锅冷油,蒜末爆香`,
        `③ 大火翻炒 2~3 分钟`,
        `④ 加少许盐和生抽,出锅`,
        ``,
        `**进阶搭配**:可加肉丝、虾仁、鸡蛋一起炒,口感更丰富。`,
        ``,
        `(注:当前是 mock 演示回复,管理员配置 DeepSeek API Key 后将由真实 AI 模型生成)`,
      ].join('\n');
    }
    if (lower.includes('营养') || lower.includes('功效') || lower.includes('好处')) {
      return [
        `${productName} 的营养价值:`,
        ``,
        `• 富含维生素 C、膳食纤维`,
        `• 含多种矿物质(钙、铁、钾)`,
        `• 热量较低,适合控制体重人群`,
        ``,
        `**适宜人群**:大多数人群均可食用。`,
        `**不宜人群**:特殊体质或对食材敏感者请咨询医生。`,
        ``,
        `(mock 演示回复,配置 API Key 后由 DeepSeek 真实生成)`,
      ].join('\n');
    }
    if (lower.includes('搭配') || (lower.includes('什么') && lower.includes('一起'))) {
      return [
        `${productName} 的搭配建议:`,
        ``,
        `**经典组合**`,
        `• 与肉类同炒,荤素均衡`,
        `• 与豆制品同煮,蛋白互补`,
        ``,
        `**忌讳搭配**:暂无强忌讳,正常搭配即可。`,
        ``,
        `(mock 演示回复)`,
      ].join('\n');
    }
    return [
      `关于「${productName}」,我可以帮你:`,
      ``,
      `🍳 做法推荐  ·  📊 营养价值  ·  🥗 搭配建议  ·  ⏱ 储存方法`,
      ``,
      `直接告诉我你的疑问,例如 "怎么做最简单"、"和什么一起吃"、"对小孩好吗" 等。`,
      ``,
      `(当前为 mock 演示,管理员配置 API Key 后启用真实 AI)`,
    ].join('\n');
  }
}

/**
 * Real 实现:调 DeepSeek OpenAI 兼容 SSE 端点
 *   POST {baseUrl}/chat/completions
 *   Authorization: Bearer {apiKey}
 *   body: { model, messages, stream: true }
 */
export class DeepSeekRealAdapter implements DeepSeekAdapter {
  constructor(private readonly cfg: DeepSeekConfig) {
    if (!cfg.apiKey || cfg.apiKey.trim().length < 8) {
      throw new Error('MISCONFIGURED: DEEPSEEK_API_KEY');
    }
  }

  async *streamChat(messages: ChatMessage[]): AsyncIterable<string> {
    const base = this.cfg.baseUrl?.trim() || DEFAULT_BASE;
    const model = this.cfg.model?.trim() || DEFAULT_MODEL;
    const url = base.replace(/\/$/, '') + '/chat/completions';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
        authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream: true, temperature: 0.7 }),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => '');
      throw new Error(`DeepSeek HTTP ${res.status}: ${errText.slice(0, 256)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const raw of lines) {
        const line = raw.trim();
        if (!line || !line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const obj = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = obj.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // 忽略心跳/不完整 chunk
        }
      }
    }
  }
}
