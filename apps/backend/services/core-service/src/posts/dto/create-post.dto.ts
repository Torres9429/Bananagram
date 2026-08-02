import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePostDto {
  @ApiProperty()
  @IsUUID()
  brandId!: string;

  @ApiProperty()
  @IsUUID()
  campaignId!: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  instructions?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}