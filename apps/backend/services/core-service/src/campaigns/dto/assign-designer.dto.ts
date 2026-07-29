import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignDesignerDto {
  @ApiProperty() @IsUUID() userId: string;
}
