import { Injectable } from '@nestjs/common';
import { prisma } from '../prisma/client';

@Injectable()
export class AdminAuditLogService {
  // BigInt no serializa a JSON de forma nativa — se convierte id a string
  // antes de devolverlo, mismo criterio que el resto de columnas BIGINT del
  // proyecto (post_status_history no tiene endpoint de lectura hoy, así que
  // este es el primer caso real de esto).
  async listRecent(limit = 50) {
    const rows = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => ({ ...row, id: row.id.toString() }));
  }
}
