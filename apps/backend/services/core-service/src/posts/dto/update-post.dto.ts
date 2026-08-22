import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdatePostDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  instructions?: string;

  // Agregado 2026-08-19 (pedido explícito): permite sumar redes sociales a
  // una publicación existente mientras sigue en un estado editable. SOLO
  // agrega — nunca quita las que ya tenía (ver posts.service.ts.updatePost,
  // createMany con skipDuplicates). Quitar una red ya adjunta queda fuera de
  // alcance a propósito: si esa red ya tiene PostSocialAccount (post
  // programado/publicado en paralelo a otras), quitarla dejaría huérfana esa
  // entrega — un caso real distinto que no se pidió resolver acá.
  @ApiPropertyOptional({ type: [String], description: 'Redes sociales a AGREGAR a la publicación (nunca reemplaza ni quita las existentes)' })
  @IsOptional()
  @IsArray({ message: 'Las redes sociales deben enviarse como una lista' })
  @ArrayMaxSize(10, { message: 'Máximo 10 redes sociales por publicación' })
  @IsUUID(undefined, { each: true, message: 'Cada red social debe ser un identificador válido' })
  socialNetworkIds?: string[];
}
