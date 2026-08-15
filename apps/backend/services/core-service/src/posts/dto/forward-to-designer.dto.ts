import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Comentario opcional del CM al reenviar al Diseñador — el motivo del
// Cliente siempre llega por separado (ver PostsService.forwardToDesigner),
// esto es solo un agregado encima, nunca lo reemplaza.
export class ForwardToDesignerDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  comment?: string;
}
