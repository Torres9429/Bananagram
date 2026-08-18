import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { ReportFormat } from '../../node_modules/.prisma-client';
import { userHasBrandRelation } from '../guards/brand-relation.util';
import { CreateReportDto } from './dto/create-report.dto';

type CurrentUser = { sub: string; roles: string[] };

// Report no tiene deletedAt/campos editables en el schema (docs/base/modelo2.txt):
// es un registro de solicitud, no una entidad mutable — por eso este service
// solo expone list/get/create, sin update/remove.
@Injectable()
export class ReportsService {
  async listReports(user: CurrentUser): Promise<any> {
    if (user.roles.includes('administrador')) {
      return prisma.report.findMany({ orderBy: { createdAt: 'desc' } });
    }
    return prisma.report.findMany({
      where: {
        brand: {
          OR: [
            { ownerId: user.sub },
            { campaigns: { some: { OR: [{ cmId: user.sub }, { designers: { some: { userId: user.sub } } }] } } },
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Mismo criterio de ownership que listReports — sin esto, cualquier usuario
  // con el permiso genérico reportes:ver podía leer el reporte de cualquier
  // marca ajena conociendo o adivinando el id (IDOR).
  async getReport(id: string, user: CurrentUser): Promise<any> {
    const report = user.roles.includes('administrador')
      ? await prisma.report.findUnique({ where: { id } })
      : await prisma.report.findFirst({
          where: {
            id,
            brand: {
              OR: [
                { ownerId: user.sub },
                { campaigns: { some: { OR: [{ cmId: user.sub }, { designers: { some: { userId: user.sub } } }] } } },
              ],
            },
          },
        });
    if (!report) throw new NotFoundException(`Report ${id} no existe`);
    return report;
  }

  // La autoridad de SI puede exportar es el permiso RBAC
  // (`reportes:exportar`, ya validado por PermissionGuard) — no un chequeo
  // de rol. Esto decide SOBRE QUÉ marca: mismo criterio de relación real
  // que listReports/getReport ya usan un poco más abajo (dueño, o CM/
  // Diseñador de alguna campaña de esa marca). Decisión de producto
  // confirmada 2026-08-17 (antes exigía ser exactamente el dueño).
  async createReport(dto: CreateReportDto, user: CurrentUser): Promise<any> {
    const brand = await prisma.brand.findFirst({ where: { id: dto.brandId, deletedAt: null } });
    if (!brand) throw new BadRequestException('brandId inválido');

    if (!user.roles.includes('administrador') && !(await userHasBrandRelation(dto.brandId, brand.ownerId, user.sub))) {
      throw new ForbiddenException('No tienes relación con esta marca — no puedes solicitar reportes de ella');
    }

    // fileUrl queda null: la generación real del archivo (csv/pdf) no está
    // implementada todavía, este endpoint solo registra la solicitud.
    return prisma.report.create({
      data: {
        brandId: dto.brandId,
        format: dto.format as ReportFormat,
        requestedBy: user.sub,
      },
    });
  }
}
