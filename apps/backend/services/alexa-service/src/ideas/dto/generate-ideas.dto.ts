import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// Para GenerateContentIdeasIntent — networkName llega opcional desde la
// skill (el modelo de interacción no lo marca como obligatorio en el
// diálogo). Sin campo `quantity` a propósito: SaveIdeaIntent solo puede
// referenciar 3 ideas por voz (su slot `ideaNumber`, tipo CustomAnswer,
// únicamente define "la primera/segunda/tercera") — devolver una cantidad
// distinta rompería ese intent. La cantidad real la fija ideas.service.ts,
// no el caller (si el Lambda igual manda `quantity`, ValidationPipe con
// whitelist:true lo descarta en silencio, no da error).
export class GenerateIdeasDto {
  @ApiProperty()
  @IsUUID()
  campaignId!: string;

  @ApiPropertyOptional({ description: 'Slot networkName del intent (ej. instagram, tiktok)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  networkName?: string;
}
