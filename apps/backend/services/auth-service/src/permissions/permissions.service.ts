import { Injectable } from '@nestjs/common';
import { prisma } from '../prisma/client';

@Injectable()
export class PermissionsService {
  updateRolePermission(roleId: string, moduleId: string, actionId: string, allowed: boolean) {
    return prisma.rolePermission.upsert({
      where: { roleId_moduleId_actionId: { roleId, moduleId, actionId } },
      update: { allowed },
      create: { roleId, moduleId, actionId, allowed },
    });
  }
}
