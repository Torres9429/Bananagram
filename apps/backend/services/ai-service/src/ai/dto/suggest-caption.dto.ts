import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// Sin postId: a diferencia de analyze-post/improve-post, esto es para una
// publicación que TODAVÍA no existe (flujo posts/new) — no hay nada que
// validar contra core-service. Las imágenes van como data URL base64 (no
// URLs de Cloudinary) porque en posts/new los archivos son locales, el post
// ni siquiera se creó todavía.
export class SuggestCaptionDto {
  @ApiProperty({ description: 'Red social objetivo (ej. instagram, tiktok)' })
  @IsString({ message: 'La red social debe ser texto' })
  @IsNotEmpty({ message: 'Indica la red social objetivo' })
  @MaxLength(120, { message: 'La red social es demasiado larga (máximo 120 caracteres)' })
  platform!: string;

  @ApiPropertyOptional({ description: 'Descripción breve de qué trata la publicación' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(500, { message: 'La descripción es demasiado larga (máximo 500 caracteres)' })
  brief?: string;

  @ApiPropertyOptional({ type: [String], description: 'Hasta 3 imágenes como data URL base64 (data:image/...;base64,...)' })
  @IsOptional()
  @IsArray({ message: 'Las imágenes deben enviarse como una lista' })
  @ArrayMaxSize(3, { message: 'Máximo 3 imágenes por publicación' })
  @IsString({ each: true, message: 'Cada imagen debe ser texto (data URL base64)' })
  @Matches(/^data:image\/(png|jpe?g|webp|gif);base64,/, { each: true, message: 'Cada imagen debe ser un data URL base64 válido' })
  // 8_000_000 caracteres base64 ≈ 6MB de binario real (base64 infla ~33%) —
  // cubre fotos reales de celular sin problema (2026-08-19: el límite
  // anterior de 3MB era un valor conservador de partida, sin evidencia de
  // qué tamaño real hacía falta; se subió tras confirmar que una foto real
  // de un usuario lo superaba). Ver main.ts: el límite del body parser (json)
  // tiene que dar margen sobre 3 imágenes a este tamaño.
  @MaxLength(8_000_000, { each: true, message: 'Cada imagen es demasiado grande (máximo ~6MB por imagen)' })
  images?: string[];
}
