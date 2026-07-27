import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

// Stub guardado: la lógica de GenerateContentIdeasIntent/SaveCustomIdeaIntent
// contra core-service todavía no está escrita — lo que se resuelve aquí es
// que ya no queda sin autenticación.
@ApiTags('ideas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ideas')
export class IdeasController {}
