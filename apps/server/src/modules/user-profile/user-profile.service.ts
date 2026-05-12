import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import {
  CustomerProfile,
  CustomerUser,
  type CustomerGender,
  type CustomerRealnameStatus,
} from '../../database/entities';
import { SmsService } from '../sms/sms.service';

import type { ChangeCustomerMobileDto, UpdateCustomerProfileDto } from './user-profile.dto';

export interface CustomerProfileView {
  nickname: string;
  avatarUrl: string;
  gender: CustomerGender;
  birthday: string;
  bio: string;
  mobile: string;
  realnameStatus: CustomerRealnameStatus;
  profileCompleted: boolean;
  updatedAt: number;
}

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(CustomerProfile) private readonly repo: Repository<CustomerProfile>,
    @InjectRepository(CustomerUser) private readonly userRepo: Repository<CustomerUser>,
    private readonly smsService: SmsService,
  ) {}

  async createDefault(userId: string, em?: EntityManager): Promise<CustomerProfile> {
    const repo = em ? em.getRepository(CustomerProfile) : this.repo;
    const now = String(Date.now());
    const row = repo.create({
      userId,
      nickname: `用户${userId}`,
      avatarUrl: null,
      gender: 'unknown',
      birthday: null,
      bio: null,
      updatedAt: now,
    });
    return repo.save(row);
  }

  async getById(userId: string): Promise<CustomerProfile | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async markCompleted(userId: string): Promise<void> {
    const now = String(Date.now());
    await this.userRepo.update({ userId }, { profileCompleted: 1, updatedAt: now });
    await this.repo.update({ userId }, { updatedAt: now });
  }

  async getCurrent(userId: string): Promise<CustomerProfileView> {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('用户不存在');
    const profile = (await this.repo.findOne({ where: { userId } })) ?? (await this.createDefault(userId));
    return this.toView(user, profile);
  }

  async updateCurrent(userId: string, dto: UpdateCustomerProfileDto): Promise<CustomerProfileView> {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('用户不存在');

    const now = String(Date.now());
    const profile = (await this.repo.findOne({ where: { userId } })) ?? (await this.createDefault(userId));

    profile.nickname = dto.nickname.trim();
    profile.avatarUrl = dto.avatarUrl?.trim() || null;
    profile.gender = dto.gender;
    profile.birthday = dto.birthday || null;
    profile.bio = dto.bio?.trim() || null;
    profile.updatedAt = now;
    await this.repo.save(profile);

    user.profileCompleted = profile.nickname ? 1 : 0;
    user.updatedAt = now;
    await this.userRepo.save(user);

    return this.toView(user, profile);
  }

  async changeMobile(userId: string, dto: ChangeCustomerMobileDto): Promise<CustomerProfileView> {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('用户不存在');

    const ok = await this.smsService.verifyCode(dto.mobile, 'change-mobile', dto.code);
    if (!ok) throw new UnauthorizedException('验证码错误或已过期');

    const exists = await this.userRepo.findOne({ where: { mobile: dto.mobile } });
    if (exists && exists.userId !== userId) {
      throw new ConflictException('该手机号已被其他账号使用');
    }

    await this.smsService.consumeCode(dto.mobile, 'change-mobile', dto.code);
    user.mobile = dto.mobile;
    user.updatedAt = String(Date.now());
    await this.userRepo.save(user);

    const profile = (await this.repo.findOne({ where: { userId } })) ?? (await this.createDefault(userId));
    return this.toView(user, profile);
  }

  private toView(user: CustomerUser, profile: CustomerProfile): CustomerProfileView {
    return {
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl ?? '',
      gender: profile.gender,
      birthday: profile.birthday ?? '',
      bio: profile.bio ?? '',
      mobile: user.mobile,
      realnameStatus: user.realnameStatus,
      profileCompleted: user.profileCompleted === 1,
      updatedAt: Number(profile.updatedAt || user.updatedAt || 0),
    };
  }
}
