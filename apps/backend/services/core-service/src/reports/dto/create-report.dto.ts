import { IsIn, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty() @IsUUID() brandId: string;
  @ApiProperty({ enum: ['csv', 'pdf'] }) @IsIn(['csv', 'pdf']) format: string;
}
