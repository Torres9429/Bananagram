import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Sin postId/campaignId obligatorio a propósito: a diferencia de
// analyze-post/improve-post, generar ideas no depende de un recurso ya
// existente cuya pertenencia haya que validar contra core-service — el
// contexto es la descripción libre que ya tiene el Cliente/Diseñador en
// pantalla al planear campañas (campanas:crear).
export class GenerateIdeasDto {
  @ApiProperty({ description: 'Red social objetivo (ej. instagram, tiktok)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  platform!: string;

  @ApiPropertyOptional({ description: 'Id de campaña, solo para correlación — no se valida pertenencia en esta versión' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  brandName?: string;

  @ApiPropertyOptional({ description: 'Categoría/nicho de la marca' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  category?: string;

  @ApiPropertyOptional({ description: 'Descripción breve del negocio/objetivo de la campaña' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(300)
  audience?: string;

  @ApiPropertyOptional({ description: 'Tono de comunicación (ej. cercano, profesional, divertido)' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  tone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  additionalContext?: string;

  @ApiPropertyOptional({ type: [String], description: 'Hasta 5 captions previos, como referencia de estilo' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  previousPosts?: string[];

  @ApiPropertyOptional({ minimum: 1, maximum: 8, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  quantity?: number;
}
