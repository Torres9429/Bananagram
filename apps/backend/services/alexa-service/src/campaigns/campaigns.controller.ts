import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

// Stub guardado: la lógica de traducir intents de voz a llamadas HTTP contra
// core-service (crear campaña, listar, asignar diseñador) todavía no está
// escrita — lo que se resuelve aquí es que ya no queda sin autenticación.
@ApiTags('campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {}
