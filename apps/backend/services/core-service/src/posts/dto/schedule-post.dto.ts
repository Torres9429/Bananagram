import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

// scheduledAt es opcional aquí porque el post pudo haber traído su propia
// fecha desde CreatePostDto (Post.scheduledAt) — solo es obligatorio en el
// service si esa fecha nunca se puso al crear (validado ahí, no en el DTO).
export class SchedulePostDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
