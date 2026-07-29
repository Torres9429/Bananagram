import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(6) password: string;
  @ApiProperty() @IsString() @MinLength(1) name: string;
  @ApiProperty({ enum: ['cliente', 'cm', 'disenador'] })
  @IsString()
  @IsIn(['cliente', 'cm', 'disenador'])
  roleName: string;
}
