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
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  campaignName!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  totalPosts!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  reach!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  interactions!: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  engagementRate?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(300)
  additionalContext?: string;
}
