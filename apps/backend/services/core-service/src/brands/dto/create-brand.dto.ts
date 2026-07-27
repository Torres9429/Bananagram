import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
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

  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() primaryColor?: string;
}
