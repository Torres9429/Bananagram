import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIdeaDto {
  @ApiProperty() @IsUUID() campaignId: string;
  @ApiProperty() @IsString() @MinLength(1) text: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;

  // 'sugerida' = generada por GenerateContentIdeasIntent y guardada tal cual
  // (SaveIdeaIntent); 'propia' = dictada libremente por el usuario
  // (SaveCustomIdeaIntent). Ambas vienen siempre de la skill — este endpoint
  // ya no lo llama la plataforma web (ver Fase 6 del plan).
  @ApiPropertyOptional({ enum: ['sugerida', 'propia'] })
  @IsOptional()
  @IsIn(['sugerida', 'propia'])
  source?: string;
}
