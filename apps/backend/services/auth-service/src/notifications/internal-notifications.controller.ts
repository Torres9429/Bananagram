import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InternalAuthGuard } from '@repo/backend-commons';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

// Tráfico servicio-a-servicio (core-service → auth-service) — protegido con
// InternalAuthGuard (secreto compartido por header, X-Internal-Token), no
// JwtAuthGuard. No se expone vía gateway, pero eso no bastaba como
// protección real: el puerto de este servicio se publica al host.
@ApiTags('internal')
@UseGuards(InternalAuthGuard)
@Controller('internal/notifications')
export class InternalNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.notifications.create(dto);
  }
}
