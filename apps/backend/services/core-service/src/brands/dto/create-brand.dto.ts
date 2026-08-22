import { ArrayMinSize, ArrayUnique, IsArray, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBrandDto {
  @ApiProperty() @IsString() @MinLength(1) name: string;
  @ApiProperty() @IsString() @MinLength(1) slug: string;

  // Regla de negocio #9: marca y perfil son funcionalmente idénticos, solo
  // cambia este campo.
  @ApiPropertyOptional({ enum: ['brand', 'profile'] })
  @IsOptional()
  @IsIn(['brand', 'profile'])
  profileType?: string;

  // Mismo catálogo de Category que ya usan Campañas y perfiles de
  // CM/Diseñador (single-select, orientativo — regla de negocio #8).
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() primaryColor?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  allowedSocial: string[];
}
