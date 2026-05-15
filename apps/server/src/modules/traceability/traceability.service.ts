import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Brackets, Repository } from 'typeorm';

import { QrcodeBatch, TraceabilityArchive, TraceabilityQrcode } from '../../database/entities';

import { encodeQrcode, verifyQrcode } from './qrcode-encoder.util';
import {
  ArchiveMutationVo,
  ArchiveVo,
  BatchGenerationResultVo,
  BatchVo,
  BindResultVo,
  CreateArchiveDto,
  ListArchivesQueryDto,
  ListArchivesVo,
  ListBatchCodesVo,
  ListBatchesQueryDto,
  ListBatchesVo,
  PublicTraceVo,
  QrcodeVo,
  UpdateArchiveDto,
} from './traceability.dto';

@Injectable()
export class TraceabilityService {
  constructor(
    @InjectRepository(TraceabilityArchive) private readonly archiveRepo: Repository<TraceabilityArchive>,
    @InjectRepository(TraceabilityQrcode) private readonly qrcodeRepo: Repository<TraceabilityQrcode>,
    @InjectRepository(QrcodeBatch) private readonly batchRepo: Repository<QrcodeBatch>,
  ) {}

  /** ====== 档案 ====== */

  async createArchive(dto: CreateArchiveDto): Promise<ArchiveMutationVo> {
    const now = String(Date.now());
    const e = this.archiveRepo.create({
      productId: dto.productId ?? null,
      batchNo: dto.batchNo,
      farmName: dto.farmName ?? null,
      farmAddress: dto.farmAddress ?? null,
      breedDate: dto.breedDate ? String(dto.breedDate) : null,
      slaughterDate: dto.slaughterDate ? String(dto.slaughterDate) : null,
      weightGrams: dto.weightGrams ?? null,
      quarantineCertNo: dto.quarantineCertNo ?? null,
      veterinarian: dto.veterinarian ?? null,
      feedType: dto.feedType ?? null,
      vaccineRecords: dto.vaccineRecords ?? null,
      status: dto.status ?? 'active',
      remark: dto.remark ?? null,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.archiveRepo.save(e);
    return { archiveId: saved.archiveId, updatedAt: saved.updatedAt };
  }

  async updateArchive(archiveId: string, dto: UpdateArchiveDto): Promise<ArchiveMutationVo> {
    const a = await this.archiveRepo.findOne({ where: { archiveId } });
    if (!a) throw new NotFoundException('archive not found');
    const now = String(Date.now());
    const patch: Partial<TraceabilityArchive> = { updatedAt: now };
    if (dto.productId !== undefined) patch.productId = dto.productId;
    if (dto.batchNo !== undefined) patch.batchNo = dto.batchNo;
    if (dto.farmName !== undefined) patch.farmName = dto.farmName;
    if (dto.farmAddress !== undefined) patch.farmAddress = dto.farmAddress;
    if (dto.breedDate !== undefined) patch.breedDate = String(dto.breedDate);
    if (dto.slaughterDate !== undefined) patch.slaughterDate = String(dto.slaughterDate);
    if (dto.weightGrams !== undefined) patch.weightGrams = dto.weightGrams;
    if (dto.quarantineCertNo !== undefined) patch.quarantineCertNo = dto.quarantineCertNo;
    if (dto.veterinarian !== undefined) patch.veterinarian = dto.veterinarian;
    if (dto.feedType !== undefined) patch.feedType = dto.feedType;
    if (dto.vaccineRecords !== undefined) patch.vaccineRecords = dto.vaccineRecords;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.remark !== undefined) patch.remark = dto.remark;
    await this.archiveRepo.update({ archiveId }, patch);
    return { archiveId, updatedAt: now };
  }

  async listArchives(query: ListArchivesQueryDto): Promise<ListArchivesVo> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.archiveRepo.createQueryBuilder('a');
    if (query.status) qb.andWhere('a.status = :st', { st: query.status });
    if (query.productId) qb.andWhere('a.product_id = :pid', { pid: query.productId });
    if (query.keyword) {
      const kw = query.keyword.trim();
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('a.batch_no LIKE :kw', { kw: `%${kw}%` })
            .orWhere('a.farm_name LIKE :kw', { kw: `%${kw}%` })
            .orWhere('a.quarantine_cert_no LIKE :kw', { kw: `%${kw}%` });
        }),
      );
    }
    qb.orderBy('a.archive_id', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    return {
      pageNo,
      pageSize,
      total,
      list: items.map((a) => this.toArchiveVo(a)),
    };
  }

  async detailArchive(archiveId: string): Promise<ArchiveVo> {
    const a = await this.archiveRepo.findOne({ where: { archiveId } });
    if (!a) throw new NotFoundException('archive not found');
    return this.toArchiveVo(a);
  }

  /** ====== 二维码批次生成 ====== */

  async generateBatch(name: string, count: number, generatedBy: string): Promise<BatchGenerationResultVo> {
    if (count <= 0 || count > 1000) {
      throw new UnprocessableEntityException({ code: 'INVALID_PARAM', message: 'count must be 1~1000' });
    }
    const now = String(Date.now());
    const batch = await this.batchRepo.save(
      this.batchRepo.create({
        name,
        totalCount: count,
        generatedBy,
        createdAt: now,
      }),
    );
    const batchSeq = Number(batch.batchId) % 46656; // 实际生产用更稳定算法,这里取模即可
    const codes: string[] = [];
    const rows: Partial<TraceabilityQrcode>[] = [];
    for (let i = 0; i < count; i++) {
      const code = encodeQrcode(batchSeq, i);
      codes.push(code);
      rows.push({
        code,
        archiveId: null,
        status: 'blank',
        generatedBatchId: batch.batchId,
        generatedAt: now,
      });
    }
    // 批量插入(每批 100 条以防超 SQL 限)
    const CHUNK = 100;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await this.qrcodeRepo.insert(rows.slice(i, i + CHUNK));
    }
    return { batchId: batch.batchId, name: batch.name, totalCount: count, codes };
  }

  async listBatches(query: ListBatchesQueryDto): Promise<ListBatchesVo> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [items, total] = await this.batchRepo
      .createQueryBuilder('b')
      .orderBy('b.batch_id', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return {
      pageNo,
      pageSize,
      total,
      list: items.map((b) =>
        plainToInstance(
          BatchVo,
          {
            batchId: b.batchId,
            name: b.name,
            totalCount: b.totalCount,
            generatedBy: b.generatedBy,
            createdAt: b.createdAt,
          },
          { excludeExtraneousValues: true },
        ),
      ),
    };
  }

  async listBatchCodes(batchId: string): Promise<ListBatchCodesVo> {
    const batch = await this.batchRepo.findOne({ where: { batchId } });
    if (!batch) throw new NotFoundException('batch not found');
    const codes = await this.qrcodeRepo
      .createQueryBuilder('q')
      .where('q.generated_batch_id = :bid', { bid: batchId })
      .orderBy('q.qrcode_id', 'ASC')
      .getMany();
    return {
      batchId,
      name: batch.name,
      codes: codes.map((c) => this.toQrcodeVo(c)),
    };
  }

  /** ====== 绑定/扫码 ====== */

  async bindCodeToArchive(code: string, archiveId: string): Promise<BindResultVo> {
    if (!verifyQrcode(code)) {
      throw new UnprocessableEntityException({ code: 'QRCODE_INVALID_CHECKSUM', message: 'qrcode invalid' });
    }
    const qr = await this.qrcodeRepo.findOne({ where: { code } });
    if (!qr) throw new NotFoundException('qrcode not found');
    if (qr.status === 'sold') {
      throw new ConflictException({ code: 'QRCODE_ALREADY_SOLD', message: 'qrcode already sold' });
    }
    if (qr.status === 'bound' && qr.archiveId !== archiveId) {
      throw new ConflictException({ code: 'QRCODE_ALREADY_BOUND', message: 'qrcode already bound to another archive' });
    }
    const a = await this.archiveRepo.findOne({ where: { archiveId } });
    if (!a) throw new NotFoundException('archive not found');
    const now = String(Date.now());
    qr.archiveId = archiveId;
    qr.status = 'bound';
    qr.boundAt = now;
    await this.qrcodeRepo.save(qr);
    return { qrcodeId: qr.qrcodeId, code: qr.code, archiveId, status: qr.status };
  }

  /** 公开接口:扫码查档案(被 customer 端调用) */
  async publicLookup(code: string): Promise<PublicTraceVo> {
    if (!verifyQrcode(code)) {
      throw new NotFoundException('qrcode invalid');
    }
    const qr = await this.qrcodeRepo.findOne({ where: { code } });
    if (!qr) throw new NotFoundException('qrcode not found');
    let archive: ArchiveVo | null = null;
    if (qr.archiveId) {
      const a = await this.archiveRepo.findOne({ where: { archiveId: qr.archiveId } });
      if (a) archive = this.toArchiveVo(a);
    }
    return { code: qr.code, status: qr.status, archive };
  }

  /** 标记售出(GR-4 weighItem 时调用,或 GR-7 联调时) */
  async markSold(code: string, orderId: string): Promise<void> {
    const qr = await this.qrcodeRepo.findOne({ where: { code } });
    if (!qr) return;
    const now = String(Date.now());
    qr.status = 'sold';
    qr.soldAt = now;
    qr.soldOrderId = orderId;
    await this.qrcodeRepo.save(qr);
  }

  private toArchiveVo(a: TraceabilityArchive): ArchiveVo {
    return plainToInstance(
      ArchiveVo,
      {
        archiveId: a.archiveId,
        productId: a.productId,
        batchNo: a.batchNo,
        farmName: a.farmName,
        farmAddress: a.farmAddress,
        breedDate: a.breedDate,
        slaughterDate: a.slaughterDate,
        weightGrams: a.weightGrams,
        quarantineCertNo: a.quarantineCertNo,
        veterinarian: a.veterinarian,
        feedType: a.feedType,
        vaccineRecords: a.vaccineRecords,
        status: a.status,
        remark: a.remark,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      },
      { excludeExtraneousValues: true },
    );
  }

  private toQrcodeVo(q: TraceabilityQrcode): QrcodeVo {
    return plainToInstance(
      QrcodeVo,
      {
        qrcodeId: q.qrcodeId,
        code: q.code,
        archiveId: q.archiveId,
        status: q.status,
        generatedBatchId: q.generatedBatchId,
        generatedAt: q.generatedAt,
        boundAt: q.boundAt,
        soldAt: q.soldAt,
        soldOrderId: q.soldOrderId,
      },
      { excludeExtraneousValues: true },
    );
  }
}
