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
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  platform!: string;

  @ApiPropertyOptional({ description: 'Descripción breve de qué trata la publicación' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  brief?: string;

  @ApiPropertyOptional({ type: [String], description: 'Hasta 3 imágenes como data URL base64 (data:image/...;base64,...)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @Matches(/^data:image\/(png|jpe?g|webp|gif);base64,/, { each: true, message: 'Cada imagen debe ser un data URL base64 válido' })
  @MaxLength(3_000_000, { each: true })
  images?: string[];
}
