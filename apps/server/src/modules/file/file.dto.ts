import { ApiProperty } from '@nestjs/swagger';
import { FileBizType } from '@o2o/contracts';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({ description: '文件业务类型', enum: Object.values(FileBizType) })
  @IsString()
  @IsEnum(FileBizType)
  bizType!: string;

  @ApiProperty({ description: 'MIME(可选,后端会以 multer 检测为准)', required: false })
  @IsOptional()
  @IsString()
  contentType?: string;
}

export class FileVo {
  @ApiProperty() fileId!: string;
  @ApiProperty() url!: string;
  @ApiProperty({ description: '预签名 URL 过期时间(毫秒时间戳)' }) expireAt!: number;
  @ApiProperty({ description: '字节数' }) size!: number;
}
