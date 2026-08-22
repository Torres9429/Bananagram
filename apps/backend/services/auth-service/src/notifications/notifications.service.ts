import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsStreamService } from './notifications-stream.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly stream: NotificationsStreamService) {}

  async listMine(userId: string) {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async markRead(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notificación no encontrada');

    return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  // Consumido por el endpoint interno (core-service → auth-service) — sin
  // validar el userId contra nada más, el caller (servicio interno) ya
  // resolvió a quién notificar.
  async create(dto: CreateNotificationDto) {
    const notification = await prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload: (dto.payload ?? {}) as any,
      },
    });

    // Push instantáneo (Fase L) a quien tenga GET /me/notifications/stream
    // abierto ahora mismo — best-effort, no afecta la creación si nadie
    // está escuchando.
    this.stream.push(dto.userId, notification);

    return notification;
  }
}
