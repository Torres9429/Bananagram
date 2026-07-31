import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBrandDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) slug?: string;

  @ApiPropertyOptional({ enum: ['brand', 'profile'] })
  @IsOptional()
  @IsIn(['brand', 'profile'])
  profileType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() primaryColor?: string;
}
