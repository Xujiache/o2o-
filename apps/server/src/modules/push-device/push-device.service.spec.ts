import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { PushDevice } from '../../database/entities';

import { PushDeviceService } from './push-device.service';

interface World {
  rows: PushDevice[];
}

function buildRepo(w: World) {
  return {
    findOne: jest.fn(
      async ({ where }: { where: { deviceToken?: string; principalType?: string } }) =>
        w.rows.find((r) => r.deviceToken === where.deviceToken && r.principalType === where.principalType) ?? null,
    ),
    save: jest.fn(async (r: PushDevice) => {
      const idx = w.rows.findIndex((x) => x.pushDeviceId === r.pushDeviceId);
      if (idx >= 0) w.rows[idx] = r;
      return r;
    }),
    insert: jest.fn(async (row: Omit<PushDevice, 'pushDeviceId'>) => {
      const id = String(w.rows.length + 1);
      w.rows.push({ ...row, pushDeviceId: id } as PushDevice);
      return { identifiers: [{ pushDeviceId: id }] };
    }),
  };
}

async function build(w: World) {
  const repo = buildRepo(w);
  const m = await Test.createTestingModule({
    providers: [PushDeviceService, { provide: getRepositoryToken(PushDevice), useValue: repo }],
  }).compile();
  return m.get(PushDeviceService);
}

describe('PushDeviceService', () => {
  it('新建绑定:写一行 + 返 bindId+enabled=true', async () => {
    const w: World = { rows: [] };
    const svc = await build(w);
    const r = await svc.bind('customer', 'C1', {
      deviceToken: 'tk1',
      platform: 'ios',
      appType: 'customer',
    });
    expect(r.bindId).toBe('1');
    expect(r.enabled).toBe(true);
    expect(w.rows).toHaveLength(1);
    expect(w.rows[0]?.pushEnabled).toBe(1);
  });

  it('重复绑定:同 deviceToken+principalType → 更新而非新建', async () => {
    const w: World = { rows: [] };
    const svc = await build(w);
    await svc.bind('rider', 'R1', { deviceToken: 'tk1', platform: 'android', appType: 'rider' });
    await svc.bind('rider', 'R2', {
      deviceToken: 'tk1',
      platform: 'ios',
      appType: 'rider',
      pushEnabled: false,
    });
    expect(w.rows).toHaveLength(1);
    expect(w.rows[0]?.principalId).toBe('R2');
    expect(w.rows[0]?.platform).toBe('ios');
    expect(w.rows[0]?.pushEnabled).toBe(0);
  });

  it('admin scope 拒绝;appType mismatch 拒绝', async () => {
    const svc = await build({ rows: [] });
    await expect(svc.bind('admin', 'A1', { deviceToken: 't', platform: 'ios', appType: 'customer' })).rejects.toThrow(
      ForbiddenException,
    );
    await expect(
      svc.bind('customer', 'C1', { deviceToken: 't', platform: 'ios', appType: 'merchant' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
