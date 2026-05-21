/**
 * AI 食材顾问 — SSE 流式 + 云端会话同步
 *
 * 接口:
 *   GET  /c/ai/conversations               列表
 *   GET  /c/ai/conversations/resolve       按 productId 找或建活跃会话
 *   GET  /c/ai/conversations/:id/messages  拉全部历史
 *   DELETE /c/ai/conversations/:id         归档(重置)
 *   POST /c/ai/chat                        SSE 流式
 *
 * SSE 事件:
 *   conversation : payload=convoId(首帧)
 *   mode         : payload=mock|real
 *   delta        : payload=增量
 *   done | error
 */
import { Header, type ApiResponse } from '@o2o/contracts';

import { tryRefresh, request } from '@/utils/request';
import { clearToken, getToken } from '@/utils/token';
import { genTraceId } from '@/utils/trace';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
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

export interface StreamChatRequest {
  conversationId?: string;
  productId?: string;
  productName?: string;
  message: string;
}

export interface StreamChatHandlers {
  onConversation?: (id: string) => void;
  onMode?: (mode: 'mock' | 'real') => void;
  onDelta: (delta: string) => void;
  onDone?: () => void;
  onError?: (msg: string) => void;
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:3000';

// ============ REST endpoints (走通用 request 拿到 401 自动 refresh) ============

export function listAiConversations(): Promise<ApiResponse<{ list: AiConversationVo[] }>> {
  return request<{ list: AiConversationVo[] }>({ url: '/api/v1/c/ai/conversations', method: 'GET' });
}

export function resolveAiConversation(
  productId?: string,
  productName?: string,
): Promise<ApiResponse<AiConversationVo>> {
  const params: Record<string, unknown> = {};
  if (productId) params.productId = productId;
  if (productName) params.productName = productName;
  return request<AiConversationVo>({ url: '/api/v1/c/ai/conversations/resolve', method: 'GET', params });
}

export function listAiMessages(conversationId: string): Promise<ApiResponse<{ list: AiMessageVo[] }>> {
  return request<{ list: AiMessageVo[] }>({
    url: `/api/v1/c/ai/conversations/${conversationId}/messages`,
    method: 'GET',
  });
}

export function archiveAiConversation(conversationId: string): Promise<ApiResponse<{ ok: boolean }>> {
  return request<{ ok: boolean }>({
    url: `/api/v1/c/ai/conversations/${conversationId}`,
    method: 'DELETE',
  });
}

// ============ SSE 流式对话 ============

async function postSse(req: StreamChatRequest, token: string, signal: AbortSignal): Promise<Response> {
  return fetch(`${BASE_URL}/api/v1/c/ai/chat`, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      [Header.CustomerToken]: token,
      [Header.TraceId]: genTraceId(),
      [Header.IdempotencyKey]: genTraceId(),
      accept: 'text/event-stream',
    },
    body: JSON.stringify(req),
  });
}

async function readStream(resp: Response, handlers: StreamChatHandlers): Promise<void> {
  if (!resp.body) {
    handlers.onError?.('响应无 body');
    return;
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx = buf.indexOf('\n\n');
    while (idx !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      parseFrame(frame, handlers);
      idx = buf.indexOf('\n\n');
    }
  }
  if (buf.trim()) parseFrame(buf, handlers);
  handlers.onDone?.();
}

export function streamChat(req: StreamChatRequest, handlers: StreamChatHandlers): () => void {
  const controller = new AbortController();
  let token = getToken();
  if (!token) {
    handlers.onError?.('请先登录后再与 AI 对话');
    setTimeout(() => uni.reLaunch({ url: '/pages/login/index' }), 400);
    return () => undefined;
  }

  void (async () => {
    try {
      let resp = await postSse(req, token!, controller.signal);

      if (resp.status === 401) {
        const ok = await tryRefresh();
        if (ok) {
          token = getToken();
          if (token) {
            resp = await postSse(req, token, controller.signal);
          }
        }
        if (resp.status === 401) {
          clearToken();
          handlers.onError?.('登录已过期,请重新登录');
          setTimeout(() => uni.reLaunch({ url: '/pages/login/index' }), 600);
          return;
        }
      }
      if (!resp.ok) {
        handlers.onError?.(`HTTP ${resp.status}`);
        return;
      }
      await readStream(resp, handlers);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      handlers.onError?.(err instanceof Error ? err.message : String(err));
    }
  })();

  return () => controller.abort();
}

function parseFrame(frame: string, handlers: StreamChatHandlers): void {
  let event = 'message';
  let data = '';
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) {
      const piece = line.slice(5).trim().replace(/\\n/g, '\n');
      data = data ? data + piece : piece;
    }
  }
  if (event === 'conversation') handlers.onConversation?.(data);
  else if (event === 'mode') handlers.onMode?.(data === 'real' ? 'real' : 'mock');
  else if (event === 'delta') handlers.onDelta(data);
  else if (event === 'done') handlers.onDone?.();
  else if (event === 'error') handlers.onError?.(data);
}
