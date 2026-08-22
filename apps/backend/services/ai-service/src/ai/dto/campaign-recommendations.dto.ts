import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

// Para GetIdeaRecommendationsIntent (Alexa Skill, vía alexa-service) y
// cualquier futuro uso web. Recibe un resumen ya agregado (no el objeto
// crudo de Prisma) — mismo criterio de "no enviar información innecesaria"
// que el resto de ai-service. El caller (alexa-service/campaigns.service.ts)
// arma este resumen a partir de GET /campaigns/:id + /metrics, que ya tiene.
export class CampaignRecommendationsDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El nombre de la campaña debe ser texto' })
  @IsNotEmpty({ message: 'Indica el nombre de la campaña' })
  @MaxLength(200, { message: 'El nombre de la campaña es demasiado largo (máximo 200 caracteres)' })
  campaignName!: string;

  @ApiProperty()
  @IsInt({ message: 'totalPosts debe ser un número entero' })
  @Min(0, { message: 'totalPosts no puede ser negativo' })
  totalPosts!: number;

  @ApiProperty()
  @IsInt({ message: 'reach debe ser un número entero' })
  @Min(0, { message: 'reach no puede ser negativo' })
  reach!: number;

  @ApiProperty()
  @IsInt({ message: 'interactions debe ser un número entero' })
  @Min(0, { message: 'interactions no puede ser negativo' })
  interactions!: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'engagementRate debe ser un número' })
  engagementRate?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El contexto adicional debe ser texto' })
  @MaxLength(300, { message: 'El contexto adicional es demasiado largo (máximo 300 caracteres)' })
  additionalContext?: string;
}
