import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '@repo/backend-commons';
import { RequirePermission } from '@repo/backend-commons';
import { AdminUsersService } from './admin-users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @RequirePermission('usuarios', 'ver')
  findAll(@Query('roleName') roleName?: string) {
    return this.users.listUsers(roleName);
  }

  @Get(':id')
  @RequirePermission('usuarios', 'ver')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getUser(id);
  }

  @Post()
  @RequirePermission('usuarios', 'crear')
  create(@Body() dto: CreateUserDto) {
    return this.users.createUser(dto);
  }

  @Patch(':id')
  @RequirePermission('usuarios', 'editar')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateUser(id, dto);
  }

  @Delete(':id')
  @RequirePermission('usuarios', 'eliminar')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.removeUser(id);
  }

  @Post(':id/roles')
  @RequirePermission('usuarios', 'editar')
  assignRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignRoleDto) {
    return this.users.assignRole(id, dto.roleId);
  }

  @Delete(':id/roles/:roleId')
  @RequirePermission('usuarios', 'editar')
  unassignRole(@Param('id', ParseUUIDPipe) id: string, @Param('roleId', ParseUUIDPipe) roleId: string) {
    return this.users.unassignRole(id, roleId);
  }
}
