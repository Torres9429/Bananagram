import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

// Sin JwtAuthGuard a propósito: tráfico servicio-a-servicio (core-service →
// auth-service, primera vez en esta dirección — hasta ahora solo existía
// auth→core para /internal/user-profiles). No se expone vía gateway (no hay
// regla /api/internal/* en su proxy), solo alcanzable en la red interna.
@ApiTags('internal')
@Controller('internal/notifications')
export class InternalNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.notifications.create(dto);
  }
}
