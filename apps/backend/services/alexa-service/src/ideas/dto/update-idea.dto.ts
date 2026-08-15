import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateIdeaDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) text?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
}
