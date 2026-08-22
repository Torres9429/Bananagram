import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCampaignDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() objective?: string;

  // Se acepta en el DTO solo para poder rechazarlo explícitamente en el
  // service (RF-2.3: el CM queda bloqueado permanentemente tras la
  // creación) — si se omitiera aquí, ValidationPipe({ whitelist: true }) lo
  // descartaría en silencio en vez de devolver un error.
  @ApiPropertyOptional() @IsOptional() @IsUUID() cmId?: string;

  @ApiPropertyOptional({ enum: ['active', 'paused', 'finished'] })
  @IsOptional()
  @IsIn(['active', 'paused', 'finished'])
  status?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
}
