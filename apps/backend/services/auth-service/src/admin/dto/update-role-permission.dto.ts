import { IsBoolean, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRolePermissionDto {
  @ApiProperty() @IsString() moduleSlug: string;
  @ApiProperty() @IsString() actionSlug: string;
  @ApiProperty() @IsBoolean() allowed: boolean;
}
