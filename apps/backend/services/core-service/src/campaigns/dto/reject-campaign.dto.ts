import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectCampaignDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
