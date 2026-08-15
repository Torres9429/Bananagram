import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';

// Push en memoria (un solo proceso, no hace falta Redis pub/sub a esta
// escala) — NotificationsService.create() llama a push() justo después de
// guardar la fila, así los clientes con streaming abierto (GET
// /me/notifications/stream) se enteran al instante, sin poll.
@Injectable()
export class NotificationsStreamService {
  private readonly logger = new Logger(NotificationsStreamService.name);
  private readonly connections = new Map<string, Set<Response>>();

  subscribe(userId: string, res: Response): void {
    if (!this.connections.has(userId)) this.connections.set(userId, new Set());
    this.connections.get(userId)!.add(res);
  }

  unsubscribe(userId: string, res: Response): void {
    const conns = this.connections.get(userId);
    if (!conns) return;
    conns.delete(res);
    if (conns.size === 0) this.connections.delete(userId);
  }

  push(userId: string, notification: unknown): void {
    const conns = this.connections.get(userId);
    if (!conns || conns.size === 0) return;

    const frame = `data: ${JSON.stringify(notification)}\n\n`;
    for (const res of conns) {
      try {
        res.write(frame);
      } catch (error) {
        this.logger.warn(`No se pudo escribir al stream de ${userId}: ${error}`);
      }
    }
  }
}
