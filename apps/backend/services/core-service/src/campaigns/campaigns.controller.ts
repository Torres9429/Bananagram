import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { AssignDesignerDto } from './dto/assign-designer.dto';

type Claims = { sub: string; roles: string[] };

@ApiTags('campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  @RequirePermission('campanas', 'ver')
  findAll(@CurrentUser() user: Claims) {
    return this.campaigns.listCampaigns(user);
  }

  // Antes de ':id': si se declararan después, Nest intentaría matchear
  // "eligible-community-managers"/"eligible-designers" contra la ruta parametrizada.
  @Get('eligible-community-managers')
  @RequirePermission('campanas', 'ver')
  findEligibleCommunityManagers() {
    return this.campaigns.listEligibleCommunityManagers();
  }

  @Get('eligible-designers')
  @RequirePermission('campanas', 'ver')
  findEligibleDesigners() {
    return this.campaigns.listEligibleDesigners();
  }

  @Get(':id')
  @RequirePermission('campanas', 'ver')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.getCampaign(id);
  }

  @Post()
  @RequirePermission('campanas', 'crear')
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: Claims) {
    return this.campaigns.createCampaign(dto, user);
  }

  // Sin BrandAccessGuard: ese guard resuelve el :id de la ruta como un
  // brandId, y aquí :id es un campaignId — reusarlo negaría siempre el
  // acceso. La verificación de pertenencia (dueño de la marca, CM asignado
  // o Administrador) vive en CampaignsService.assertCanManage.
  @Patch(':id')
  @RequirePermission('campanas', 'editar')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCampaignDto, @CurrentUser() user: Claims) {
    return this.campaigns.updateCampaign(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission('campanas', 'editar')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Claims) {
    return this.campaigns.removeCampaign(id, user);
  }

  @Post(':id/designers')
  @RequirePermission('campanas', 'asignar')
  assignDesigner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDesignerDto,
    @CurrentUser() user: Claims,
  ) {
    return this.campaigns.assignDesigner(id, dto.userId, user);
  }

  @Delete(':id/designers/:userId')
  @RequirePermission('campanas', 'asignar')
  unassignDesigner(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: Claims,
  ) {
    return this.campaigns.unassignDesigner(id, userId, user);
  }
}
