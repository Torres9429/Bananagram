import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { ReportFormat } from '../../node_modules/.prisma-client';
import { CreateReportDto } from './dto/create-report.dto';

type CurrentUser = { sub: string; role: string };

// Report no tiene deletedAt/campos editables en el schema (docs/base/modelo2.txt):
// es un registro de solicitud, no una entidad mutable — por eso este service
// solo expone list/get/create, sin update/remove.
@Injectable()
export class ReportsService {
  async listReports(user: CurrentUser): Promise<any> {
    if (user.role === 'administrador') {
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

  async getReport(id: string): Promise<any> {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException(`Report ${id} no existe`);
    return report;
  }

  async createReport(dto: CreateReportDto, user: CurrentUser): Promise<any> {
    const brand = await prisma.brand.findFirst({ where: { id: dto.brandId, deletedAt: null } });
    if (!brand) throw new BadRequestException('brandId inválido');

    if (user.role !== 'administrador' && brand.ownerId !== user.sub) {
      throw new ForbiddenException('Solo el dueño de la marca puede solicitar reportes de ella');
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
