import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@repo/backend-commons';
import { PermissionGuard } from '@repo/backend-commons';
import { RequirePermission } from '@repo/backend-commons';
import { CurrentUser } from '@repo/backend-commons';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

type Claims = { sub: string; roles: string[] };

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @RequirePermission('reportes', 'ver')
  findAll(@CurrentUser() user: Claims) {
    return this.reports.listReports(user);
  }

  @Get(':id')
  @RequirePermission('reportes', 'ver')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reports.getReport(id);
  }

  @Post()
  @RequirePermission('reportes', 'exportar')
  create(@Body() dto: CreateReportDto, @CurrentUser() user: Claims) {
    return this.reports.createReport(dto, user);
  }
}
