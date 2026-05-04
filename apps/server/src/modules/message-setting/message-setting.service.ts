import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { MessageSetting } from '../../database/entities';

@Injectable()
export class MessageSettingService {
  constructor(@InjectRepository(MessageSetting) private readonly repo: Repository<MessageSetting>) {}

  /**
   * 创建默认消息设置(3 个开关全 1)。在自动注册事务内调用。
   */
  async createDefault(userId: string, em?: EntityManager): Promise<MessageSetting> {
    const repo = em ? em.getRepository(MessageSetting) : this.repo;
    const now = String(Date.now());
    const row = repo.create({
      userId,
      orderNotify: 1,
      activityNotify: 1,
      smsNotify: 1,
      updatedAt: now,
    });
    return repo.save(row);
  }

  async getByUserId(userId: string): Promise<MessageSetting | null> {
    return this.repo.findOne({ where: { userId } });
  }
}
