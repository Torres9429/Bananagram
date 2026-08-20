import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// Solo el id — el contenido/plataforma/imagen se obtienen de core-service
// (CoreServiceClient.fetchPostContext, reenviando el Bearer del caller), no
// del body. Evita que el frontend pueda mandar un caption arbitrario "como
// si" perteneciera a un post que no le corresponde — la única fuente de
// verdad del contenido a analizar es el Post real, con la misma validación
// de pertenencia que ya usa GET /posts/:id en core-service.
export class AnalyzePostDto {
  @ApiProperty()
  @IsUUID(undefined, { message: 'postId debe ser un identificador válido' })
  postId!: string;

  @ApiPropertyOptional({ description: 'Instrucción adicional para el análisis (ej. "enfócate en el CTA")' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'La instrucción adicional debe ser texto' })
  @IsNotEmpty({ message: 'La instrucción adicional no puede estar vacía' })
  @MaxLength(300, { message: 'La instrucción adicional es demasiado larga (máximo 300 caracteres)' })
  additionalContext?: string;
}
