import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIdeaDto {
  @ApiProperty() @IsUUID() campaignId: string;
  @ApiProperty() @IsString() @MinLength(1) text: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;

  // Default 'propia': una idea creada por HTTP viene del panel web, a
  // diferencia de 'sugerida' (generada por la Alexa Skill vía alexa-service).
  @ApiPropertyOptional({ enum: ['sugerida', 'propia'] })
  @IsOptional()
  @IsIn(['sugerida', 'propia'])
  source?: string;
}
