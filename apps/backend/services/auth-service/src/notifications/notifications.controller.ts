import { Controller, Get, Param, Patch, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '@repo/backend-commons';
import { NotificationsService } from './notifications.service';
import { NotificationsStreamService } from './notifications-stream.service';

type Claims = { sub: string; roles: string[] };

// Mantiene viva la conexión a través de proxies/timeouts de inactividad —
// no hay timeout explícito configurado hoy en el gateway, pero un socket
// inactivo puede cortarse en otras capas (SO, balanceadores, etc.).
const PING_INTERVAL_MS = 20000;

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly stream: NotificationsStreamService,
  ) {}

  @Get()
  listMine(@CurrentUser() user: Claims) {
    return this.notifications.listMine(user.sub);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: Claims) {
    return this.notifications.markRead(id, user.sub);
  }

  // Push instantáneo (Fase L) — conexión larga (Server-Sent Events), no un
  // request/response normal, por eso usa @Res() con control manual en vez
  // del retorno automático de Nest (que cerraría la respuesta de inmediato).
  @Get('stream')
  streamNotifications(@CurrentUser() user: Claims, @Res() res: Response) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(': connected\n\n');

    this.stream.subscribe(user.sub, res);

    const ping = setInterval(() => {
      res.write(': ping\n\n');
    }, PING_INTERVAL_MS);

    res.on('close', () => {
      clearInterval(ping);
      this.stream.unsubscribe(user.sub, res);
    });
  }
}
