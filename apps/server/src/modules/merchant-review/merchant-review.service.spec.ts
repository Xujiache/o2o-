import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import type { OrderReview, ReviewReply, Store } from '../../database/entities';

import { MerchantReviewService } from './merchant-review.service';

interface World {
  replies: ReviewReply[];
  reviews: OrderReview[];
  stores: Store[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const replyRepo: any = {
    findOne: jest.fn(async (opt: any) => w.replies.find((r) => r.orderReviewId === opt.where.orderReviewId) ?? null),
    create: jest.fn((row: any) => row),
    save: jest.fn(async (row: any) => {
      const inserted = { ...row, reviewReplyId: String(w.replies.length + 1) };
      w.replies.push(inserted);
      return inserted;
    }),
  };
  const reviewRepo: any = {
    findOne: jest.fn(async (opt: any) => w.reviews.find((r) => r.orderReviewId === opt.where.orderReviewId) ?? null),
  };
  const storeRepo: any = {
    findOne: jest.fn(async (opt: any) => w.stores.find((s) => s.merchantId === opt.where.merchantId) ?? null),
  };

  const foodOrderRepo: any = { find: jest.fn(async () => []) };
  const fileService: any = { resolveUrls: jest.fn(async () => ({})) };

  const svc = new MerchantReviewService(replyRepo, reviewRepo, storeRepo, foodOrderRepo, fileService);
  return { svc };
  /* eslint-enable */
}

describe('MerchantReviewService', () => {
  let w: World;
  beforeEach(() => {
    w = {
      replies: [],
      reviews: [
        {
          orderReviewId: '800001',
          orderId: '510001',
          customerId: '10001',
          storeId: '20001',
          rating: 5,
        } as OrderReview,
      ],
      stores: [{ storeId: '20001', merchantId: '30001' } as Store],
    };
  });

  it('reply 成功', async () => {
    const { svc } = buildService(w);
    const r = await svc.reply('30001', '800001', { content: '感谢支持' });
    expect(r.reviewReplyId).toBe('1');
    expect(w.replies.length).toBe(1);
    expect(w.replies[0]!.content).toBe('感谢支持');
  });

  it('已回复抛 DUPLICATE_REQUEST', async () => {
    w.replies.push({ orderReviewId: '800001' } as ReviewReply);
    const { svc } = buildService(w);
    await expect(svc.reply('30001', '800001', { content: 'x' })).rejects.toThrow(BadRequestException);
  });

  it('review 不存在抛 NotFound', async () => {
    const { svc } = buildService(w);
    await expect(svc.reply('30001', '999', { content: 'x' })).rejects.toThrow(NotFoundException);
  });

  it('不归属本商家抛 FORBIDDEN', async () => {
    w.reviews[0]!.storeId = '99999';
    const { svc } = buildService(w);
    await expect(svc.reply('30001', '800001', { content: 'x' })).rejects.toThrow(ForbiddenException);
  });
});
