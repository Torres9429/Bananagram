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
  @IsString({ message: 'La red social debe ser texto' })
  @IsNotEmpty({ message: 'Indica la red social objetivo' })
  @MaxLength(120, { message: 'La red social es demasiado larga (máximo 120 caracteres)' })
  platform!: string;

  @ApiPropertyOptional({ description: 'Id de campaña, solo para correlación — no se valida pertenencia en esta versión' })
  @IsOptional()
  @IsUUID(undefined, { message: 'campaignId debe ser un identificador válido' })
  campaignId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El nombre de la marca debe ser texto' })
  @MaxLength(200, { message: 'El nombre de la marca es demasiado largo (máximo 200 caracteres)' })
  brandName?: string;

  @ApiPropertyOptional({ description: 'Categoría/nicho de la marca' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'La categoría debe ser texto' })
  @MaxLength(200, { message: 'La categoría es demasiado larga (máximo 200 caracteres)' })
  category?: string;

  @ApiPropertyOptional({ description: 'Descripción breve del negocio/objetivo de la campaña' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(500, { message: 'La descripción es demasiado larga (máximo 500 caracteres)' })
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'La audiencia debe ser texto' })
  @MaxLength(300, { message: 'La audiencia es demasiado larga (máximo 300 caracteres)' })
  audience?: string;

  @ApiPropertyOptional({ description: 'Tono de comunicación (ej. cercano, profesional, divertido)' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El tono debe ser texto' })
  @MaxLength(100, { message: 'El tono es demasiado largo (máximo 100 caracteres)' })
  tone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El contexto adicional debe ser texto' })
  @MaxLength(500, { message: 'El contexto adicional es demasiado largo (máximo 500 caracteres)' })
  additionalContext?: string;

  @ApiPropertyOptional({ type: [String], description: 'Hasta 5 captions previos, como referencia de estilo' })
  @IsOptional()
  @IsArray({ message: 'Las publicaciones previas deben enviarse como una lista' })
  @ArrayMaxSize(5, { message: 'Máximo 5 publicaciones previas de referencia' })
  @IsString({ each: true, message: 'Cada publicación previa debe ser texto' })
  @MaxLength(300, { each: true, message: 'Cada publicación previa es demasiado larga (máximo 300 caracteres)' })
  previousPosts?: string[];

  @ApiPropertyOptional({ minimum: 1, maximum: 8, default: 5 })
  @IsOptional()
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad mínima es 1' })
  @Max(8, { message: 'La cantidad máxima es 8' })
  quantity?: number;
}
