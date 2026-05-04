import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { CustomerProfile } from '../../database/entities';

@Injectable()
export class UserProfileService {
  constructor(@InjectRepository(CustomerProfile) private readonly repo: Repository<CustomerProfile>) {}

  /**
   * 创建默认资料(自动注册流程内调用)。
   * 传入 EntityManager 可参与外层事务。
   */
  async createDefault(userId: string, em?: EntityManager): Promise<CustomerProfile> {
    const repo = em ? em.getRepository(CustomerProfile) : this.repo;
    const now = String(Date.now());
    const row = repo.create({
      userId,
      nickname: `用户${userId}`,
      avatarUrl: null,
      gender: 'unknown',
      birthday: null,
      updatedAt: now,
    });
    return repo.save(row);
  }

  async getById(userId: string): Promise<CustomerProfile | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async markCompleted(userId: string): Promise<void> {
    // profile_completed 字段在 customer_user 表上,本服务不直接更新;由调用方处理。
    // 留接口给后续 stage 调用(如填资料完成时)。
    await this.repo.update({ userId }, { updatedAt: String(Date.now()) });
  }
}
