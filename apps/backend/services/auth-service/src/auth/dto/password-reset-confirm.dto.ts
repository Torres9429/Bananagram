import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetConfirmDto {
  @ApiProperty() @IsString() token: string;
  @ApiProperty() @IsString() @MinLength(6) newPassword: string;
}
