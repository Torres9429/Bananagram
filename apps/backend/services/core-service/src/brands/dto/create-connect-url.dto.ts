import { ArrayUnique, IsArray, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConnectUrlDto {
  // Sin esto, BrandsService.createConnectUrl ofrece todo el catálogo activo
  // de redes sociales.
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  allowedSocial?: string[];
}
