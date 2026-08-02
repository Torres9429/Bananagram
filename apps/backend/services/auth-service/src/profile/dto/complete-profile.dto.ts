import { ArrayUnique, IsArray, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CompleteProfileDto {
  @ApiProperty() @IsString() @MinLength(1) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;

  // Obligatorios para community_manager/disenador (no para cliente) — la
  // validación real vive en core-service (POST /internal/user-profiles),
  // que es quien conoce el catálogo de Category/Specialty.
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  specialtyIds?: string[];
}
