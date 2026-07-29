import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertUserProfileDto {
  @ApiProperty() @IsString() userId: string;
  @ApiProperty() @IsString() @MinLength(1) name: string;
}
