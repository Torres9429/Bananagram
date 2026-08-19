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
  @IsUUID()
  postId!: string;

  @ApiProperty({ enum: ImprovePostAction })
  @IsEnum(ImprovePostAction)
  action!: ImprovePostAction;

  @ApiPropertyOptional({ description: 'Plataforma destino, usado cuando action=adaptar' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  targetPlatform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  additionalContext?: string;
}
