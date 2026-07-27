import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() roleName?: string;

  @ApiPropertyOptional({ enum: ['pending', 'active', 'suspended'] })
  @IsOptional()
  @IsIn(['pending', 'active', 'suspended'])
  status?: string;
}
