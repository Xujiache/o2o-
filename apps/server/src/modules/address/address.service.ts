import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { DataSource, Repository } from 'typeorm';

import { CustomerAddress } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import { AddressItemVo, AddressPageVo, UpsertAddressDto, UpsertAddressVo } from './address.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(CustomerAddress) private readonly repo: Repository<CustomerAddress>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventBus: DomainEventBus,
  ) {}

  async list(userId: string, pageNo = 1, pageSize = 20): Promise<AddressPageVo> {
    const [rows, total] = await this.repo.findAndCount({
      where: { userId },
      order: { isDefault: 'DESC', updatedAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    const list = rows.map((r) =>
      plainToInstance(
        AddressItemVo,
        {
          addressId: r.addressId,
          receiverName: r.receiverName,
          mobileMasked: r.mobile, // 明文存,@Mask 在序列化时脱敏
          cityCode: r.cityCode,
          detail: r.detail,
          lng: r.lng,
          lat: r.lat,
          isDefault: r.isDefault === 1,
        },
        { excludeExtraneousValues: true },
      ),
    );
    return { pageNo, pageSize, total, list };
  }

  async upsert(userId: string, dto: UpsertAddressDto): Promise<UpsertAddressVo> {
    return this.dataSource.transaction(async (em) => {
      const repo = em.getRepository(CustomerAddress);
      const now = String(Date.now());

      // 设默认 → 先把同 user 全部 isDefault=0
      if (dto.isDefault) {
        await repo.update({ userId }, { isDefault: 0, updatedAt: now });
      }

      let action: 'create' | 'update' | 'set-default';
      let addressId: string;

      if (dto.addressId) {
        const existing = await repo.findOne({ where: { addressId: dto.addressId } });
        if (!existing) {
          throw new ForbiddenException('address not found');
        }
        if (existing.userId !== userId) {
          throw new ForbiddenException("cannot modify another user's address");
        }
        existing.receiverName = dto.receiverName;
        existing.mobile = dto.mobile;
        existing.cityCode = dto.cityCode;
        existing.detail = dto.detail;
        existing.lng = String(dto.lng);
        existing.lat = String(dto.lat);
        existing.isDefault = dto.isDefault ? 1 : existing.isDefault;
        existing.updatedAt = now;
        await repo.save(existing);
        addressId = existing.addressId;
        action = dto.isDefault ? 'set-default' : 'update';
      } else {
        const inserted = await repo.save(
          repo.create({
            userId,
            receiverName: dto.receiverName,
            mobile: dto.mobile,
            cityCode: dto.cityCode,
            detail: dto.detail,
            lng: String(dto.lng),
            lat: String(dto.lat),
            isDefault: dto.isDefault ? 1 : 0,
            createdAt: now,
            updatedAt: now,
          }),
        );
        addressId = inserted.addressId;
        action = 'create';
      }

      await this.eventBus.publish(
        EventName.CustomerAddressChanged,
        { userId, addressId, action },
        { bizType: 'customer-address', bizId: addressId },
      );

      return { addressId, isDefault: dto.isDefault };
    });
  }
}
