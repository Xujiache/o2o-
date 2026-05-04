export interface PushOneInput {
  cid: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}

export interface GetuiAdapter {
  pushOne(input: PushOneInput): Promise<{ taskId: string }>;
  pushBatch(cids: string[], title: string, body: string): Promise<{ taskId: string }>;
}

export class GetuiMockAdapter implements GetuiAdapter {
  async pushOne(input: PushOneInput): Promise<{ taskId: string }> {
    return { taskId: `mock-push-${input.cid.slice(0, 6)}` };
  }
  async pushBatch(_cids: string[], _title: string, _body: string): Promise<{ taskId: string }> {
    return { taskId: `mock-push-batch-${Date.now()}` };
  }
}

export class GetuiRealAdapter implements GetuiAdapter {
  constructor(opts: { appId: string; appKey: string; masterSecret: string }) {
    if (!opts.appId || !opts.appKey || !opts.masterSecret) {
      throw new Error('getui credentials missing — set INTEGRATION_MODE=mock until ready');
    }
  }
  pushOne(): Promise<{ taskId: string }> {
    throw new Error('getui real adapter not implemented yet');
  }
  pushBatch(): Promise<{ taskId: string }> {
    throw new Error('getui real adapter not implemented yet');
  }
}
