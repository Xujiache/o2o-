import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Brackets, Repository } from 'typeorm';

import {
  AccountDisableRecord,
  AdminUser,
  CustomerProfile,
  CustomerUser,
  LoginDevice,
  RealnameRecord,
  RiskUserTag,
} from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { CustomerAuthService } from '../customer-auth/customer-auth.service';

import {
  ChangeStatusDto,
  ChangeStatusVo,
  CustomerDetailVo,
  CustomerListItemVo,
  CustomerListPageVo,
  ListCustomersQueryDto,
  RealnameRecordItemVo,
  RealnameRecordPageVo,
} from './admin-user.dto';

@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(CustomerUser) private readonly userRepo: Repository<CustomerUser>,
    @InjectRepository(CustomerProfile) private readonly profileRepo: Repository<CustomerProfile>,
    @InjectRepository(LoginDevice) private readonly deviceRepo: Repository<LoginDevice>,
    @InjectRepository(RealnameRecord) private readonly recordRepo: Repository<RealnameRecord>,
    @InjectRepository(RiskUserTag) private readonly riskRepo: Repository<RiskUserTag>,
    @InjectRepository(AccountDisableRecord) private readonly disableRecordRepo: Repository<AccountDisableRecord>,
    @InjectRepository(AdminUser) private readonly adminRepo: Repository<AdminUser>,
    private readonly customerAuthService: CustomerAuthService,
    private readonly eventBus: DomainEventBus,
  ) {}

  async listCustomers(query: ListCustomersQueryDto): Promise<CustomerListPageVo> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.userRepo.createQueryBuilder('u');

    if (query.realnameStatus) {
      qb.andWhere('u.realname_status = :rs', { rs: query.realnameStatus });
    }
    if (query.accountStatus) {
      qb.andWhere('u.account_status = :as', { as: query.accountStatus });
    }
    if (query.keyword) {
      const kw = query.keyword.trim();
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('u.user_id = :uid', { uid: kw })
            .orWhere('u.mobile = :mobile', { mobile: kw })
            .orWhere('u.mobile LIKE :mlike', { mlike: `%${kw}%` });
        }),
      );
    }
    qb.orderBy('u.created_at', 'DESC');
    qb.skip((pageNo - 1) * pageSize).take(pageSize);

    const [users, total] = await qb.getManyAndCount();

    // 批量取 profile / 最新 login_device
    const userIds = users.map((u) => u.userId);
    const profiles = userIds.length
      ? await this.profileRepo.find({ where: userIds.map((id) => ({ userId: id })) })
      : [];
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const lastLogins = userIds.length
      ? await this.deviceRepo
          .createQueryBuilder('d')
          .where('d.user_id IN (:...ids)', { ids: userIds })
          .orderBy('d.login_at', 'DESC')
          .getMany()
      : [];
    const lastLoginMap = new Map<string, string>();
    for (const d of lastLogins) {
      if (!lastLoginMap.has(d.userId)) lastLoginMap.set(d.userId, d.loginAt);
    }

    const list = users.map((u) =>
      plainToInstance(
        CustomerListItemVo,
        {
          userId: u.userId,
          mobileMasked: u.mobile,
          nickname: profileMap.get(u.userId)?.nickname ?? `用户${u.userId}`,
          realnameStatus: u.realnameStatus,
          accountStatus: u.accountStatus,
          registeredAt: u.createdAt,
          lastLoginAt: lastLoginMap.get(u.userId) ?? null,
        },
        { excludeExtraneousValues: true },
      ),
    );
    return { pageNo, pageSize, total, list };
  }

  async getCustomerDetail(userId: string): Promise<CustomerDetailVo> {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('user not found');
    const profile = await this.profileRepo.findOne({ where: { userId } });
    const devices = await this.deviceRepo.find({
      where: { userId },
      order: { loginAt: 'DESC' },
      take: 5,
    });
    const riskTags = await this.riskRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });

    return plainToInstance(
      CustomerDetailVo,
      {
        userId: user.userId,
        mobileMasked: user.mobile,
        nickname: profile?.nickname ?? `用户${user.userId}`,
        realnameStatus: user.realnameStatus,
        accountStatus: user.accountStatus,
        profileCompleted: user.profileCompleted === 1,
        recentDevices: devices.map((d) => ({
          deviceId: d.deviceId,
          platform: d.platform,
          loginAt: d.loginAt,
          status: d.status,
        })),
        riskTags: riskTags.map((t) => ({
          tagType: t.tagType,
          reason: t.reason,
          createdAt: t.createdAt,
        })),
      },
      { excludeExtraneousValues: true },
    );
  }

  async listRealnameRecords(userId: string, pageNo = 1, pageSize = 20): Promise<RealnameRecordPageVo> {
    const [records, total] = await this.recordRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    const list = records.map((r) =>
      plainToInstance(
        RealnameRecordItemVo,
        {
          recordId: r.recordId,
          realNameMasked: r.realName,
          idCardMasked: r.idCardNo,
          status: r.status,
          failedReason: r.failedReason,
          verifiedAt: r.verifiedAt,
          createdAt: r.createdAt,
        },
        { excludeExtraneousValues: true },
      ),
    );
    return { pageNo, pageSize, total, list };
  }

  async changeStatus(userId: string, operatorId: string, dto: ChangeStatusDto): Promise<ChangeStatusVo> {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('user not found');

    const targetStatus = dto.operation === 'disable' ? 'disabled' : 'active';

    // 幂等:已是目标态 → 不重发事件
    if (user.accountStatus === targetStatus) {
      return { userId: user.userId, accountStatus: user.accountStatus };
    }

    const now = String(Date.now());
    await this.userRepo.update({ userId }, { accountStatus: targetStatus, updatedAt: now });

    // stage 4 — 写 account_disable_record(disable + enable 都记)
    const operatorUsername = await this.resolveOperatorUsername(operatorId);
    await this.disableRecordRepo.insert({
      accountType: 'customer',
      accountId: userId,
      action: dto.operation,
      reason: dto.reason ?? null,
      operatorAdminId: operatorId,
      operatorUsername,
      createdAt: now,
    });

    if (dto.operation === 'disable') {
      // 同步吊销该用户全部 login_device(由 AccountDisabledSubscriber 也会异步处理 — 双保险幂等)
      await this.customerAuthService.revokeAllDevices(userId);
      await this.eventBus.publish(
        EventName.CustomerAccountDisabled,
        { userId, operatorId, reason: dto.reason },
        { bizType: 'customer', bizId: userId },
      );
    }

    // stage 4 通用账号禁用启用事件(无论 disable 还是 enable 都发,subscriber 区分 action)
    await this.eventBus.publish(
      EventName.AccountDisabled,
      {
        accountType: 'customer',
        accountId: userId,
        action: dto.operation,
        reason: dto.reason,
        operatorAdminId: operatorId,
        operatedAt: Number(now),
      },
      { bizType: 'customer', bizId: userId },
    );

    return { userId, accountStatus: targetStatus };
  }

  private async resolveOperatorUsername(adminUserId: string): Promise<string> {
    const admin = await this.adminRepo.findOne({ where: { adminUserId } });
    return admin?.username ?? `admin-${adminUserId}`;
  }

  async listDisableRecords(query: {
    accountType?: 'customer' | 'merchant' | 'rider';
    accountId?: string;
    pageNo?: number;
    pageSize?: number;
  }): Promise<{
    pageNo: number;
    pageSize: number;
    total: number;
    list: import('../../database/entities').AccountDisableRecord[];
  }> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Record<string, unknown> = {};
    if (query.accountType) where.accountType = query.accountType;
    if (query.accountId) where.accountId = query.accountId;
    const [list, total] = await this.disableRecordRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    return { pageNo, pageSize, total, list };
  }
}
