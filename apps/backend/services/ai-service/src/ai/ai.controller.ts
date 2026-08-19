import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, PermissionGuard, RequirePermission } from '@repo/backend-commons';
import { AiService } from './ai.service';
import { GenerateIdeasDto } from './dto/generate-ideas.dto';
import { AnalyzePostDto } from './dto/analyze-post.dto';
import { ImprovePostDto } from './dto/improve-post.dto';
import { SuggestCaptionDto } from './dto/suggest-caption.dto';
import { CampaignRecommendationsDto } from './dto/campaign-recommendations.dto';

type Claims = { sub: string; roles: string[] };

// Permisos reutilizados del catálogo real, sin módulo "ia" nuevo (decisión
// ya tomada, ver docs de la auditoría): generate-ideas vive en el dominio de
// campañas (mismo criterio que alexa-service/ideas.controller.ts), analyze
// es de solo lectura sobre una publicación (publicaciones:ver — el Cliente
// debe poder analizar sin poder editar), improve sí propone una reescritura
// (publicaciones:editar).
@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('generate-ideas')
  @RequirePermission('campanas', 'crear')
  generateIdeas(@Body() dto: GenerateIdeasDto, @CurrentUser() _user: Claims) {
    return this.ai.generateIdeas(dto);
  }

  @Post('analyze-post')
  @RequirePermission('publicaciones', 'ver')
  analyzePost(@Body() dto: AnalyzePostDto, @Headers('authorization') authHeader: string) {
    return this.ai.analyzePost(dto, authHeader);
  }

  @Post('improve-post')
  @RequirePermission('publicaciones', 'editar')
  improvePost(@Body() dto: ImprovePostDto, @Headers('authorization') authHeader: string) {
    return this.ai.improvePost(dto, authHeader);
  }

  // Sin postId: la publicación todavía no existe (posts/new) — mismo
  // permiso que ya usa el botón "Crear publicación".
  @Post('suggest-caption')
  @RequirePermission('publicaciones', 'crear')
  suggestCaption(@Body() dto: SuggestCaptionDto) {
    return this.ai.suggestCaption(dto);
  }

  // Sin postId ni campaignId: recibe el resumen ya agregado (el caller —
  // alexa-service/campaigns.service.ts — lo arma con datos que ya tiene, no
  // se le pide nada nuevo a core-service desde acá). De solo lectura, mismo
  // criterio que analyze-post: 'ver', no 'crear'/'editar'.
  @Post('campaign-recommendations')
  @RequirePermission('campanas', 'ver')
  campaignRecommendations(@Body() dto: CampaignRecommendationsDto) {
    return this.ai.campaignRecommendations(dto);
  }
}
