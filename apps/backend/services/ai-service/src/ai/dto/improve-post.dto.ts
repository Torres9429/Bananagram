import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export enum ImprovePostAction {
  MEJORAR = 'mejorar',
  VARIANTES = 'variantes',
  HASHTAGS = 'hashtags',
  ADAPTAR = 'adaptar',
}

// Mismo criterio que AnalyzePostDto: el contenido real se obtiene de
// core-service vía postId, nunca se confía en un caption libre del body.
export class ImprovePostDto {
  @ApiProperty()
  @IsUUID(undefined, { message: 'postId debe ser un identificador válido' })
  postId!: string;

  @ApiProperty({ enum: ImprovePostAction })
  @IsEnum(ImprovePostAction, { message: 'action debe ser uno de: mejorar, variantes, hashtags, adaptar' })
  action!: ImprovePostAction;

  @ApiPropertyOptional({ description: 'Plataforma destino, usado cuando action=adaptar' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'La plataforma destino debe ser texto' })
  @MaxLength(120, { message: 'La plataforma destino es demasiado larga (máximo 120 caracteres)' })
  targetPlatform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'La instrucción adicional debe ser texto' })
  @MaxLength(500, { message: 'La instrucción adicional es demasiado larga (máximo 500 caracteres)' })
  additionalContext?: string;
}
