import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsString, Length } from 'class-validator';

export class RoleItemVo {
  @ApiProperty()
  roleId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['admin', 'merchant', 'rider', 'customer'] })
  scope!: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ type: [String] })
  permissionCodes!: string[];
}

export class RoleListVo {
  @ApiProperty({ type: [RoleItemVo] })
  list!: RoleItemVo[];
}

export class PermissionItemVo {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['menu', 'button', 'data'] })
  type!: string;

  @ApiProperty({ enum: ['admin', 'merchant', 'rider', 'customer', 'public'] })
  scope!: string;

  @ApiProperty({ required: false })
  parentCode?: string | null;
}

export class PermissionGroupVo {
  @ApiProperty({ enum: ['customer', 'merchant', 'rider', 'admin', 'public'] })
  group!: string;

  @ApiProperty({ type: [PermissionItemVo] })
  permissions!: PermissionItemVo[];
}

export class PermissionTreeVo {
  @ApiProperty({ type: [PermissionGroupVo] })
  groups!: PermissionGroupVo[];
}

export class UpdateRolePermissionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @Length(1, 128, { each: true })
  permissionCodes!: string[];
}

export class UpdateRolePermissionsVo {
  @ApiProperty()
  roleId!: string;
  @ApiProperty()
  appliedCodes!: string[];
  @ApiProperty()
  affectedAdminUsers!: number;
  @ApiProperty()
  updatedAt!: string;
}
