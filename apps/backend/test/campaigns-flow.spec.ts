import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CampaignsModule } from '../services/core-service/src/campaigns/campaigns.module';
import { CampaignsService } from '../services/core-service/src/campaigns/campaigns.service';
import { UserProfilesController } from '../services/core-service/src/internal/user-profiles.controller';
import { prisma as corePrisma } from '../services/core-service/src/prisma/client';
import { cleanDatabase } from './helpers/db.helper';

// Integración real contra Postgres (docker compose up -d postgres) — sin
// mocks de Prisma, mismo patrón que auth.integration.spec.ts. Cubre la
// validación de rol real (UserProfile.roleName) agregada en
// feat/campaings: crear campaña requiere un cmId con perfil 'cm', asignar
// diseñador requiere un perfil 'disenador', y el CM no se puede reasignar.
describe('Campaigns Flow Integration', () => {
  let campaignsService: CampaignsService;
  const profilesController = new UserProfilesController();

  const clientUserId = randomUUID();
  const cmUserId = randomUUID();
  const otherCmUserId = randomUUID();
  const designerUserId = randomUUID();
  const plainClientUserId = randomUUID();

  let brandId: string;
  let categoryId: string;
  let specialtyId: string;

  const clientClaims = { sub: clientUserId, role: 'cliente' };

  beforeAll(async () => {
    await cleanDatabase();

    const category = await corePrisma.category.upsert({
      where: { name: 'Test Category - Campaigns Flow' },
      update: {},
      create: { name: 'Test Category - Campaigns Flow' },
    });
    categoryId = category.id;

    const specialty = await corePrisma.specialty.upsert({
      where: { name: 'Test Specialty - Campaigns Flow' },
      update: {},
      create: { name: 'Test Specialty - Campaigns Flow' },
    });
    specialtyId = specialty.id;

    const brand = await corePrisma.brand.create({
      data: { name: 'Marca de prueba', slug: `marca-prueba-${randomUUID()}`, ownerId: clientUserId },
    });
    brandId = brand.id;

    await corePrisma.userProfile.create({
      data: { userId: cmUserId, name: 'CM de prueba', roleName: 'cm' },
    });
    await corePrisma.userProfile.create({
      data: { userId: designerUserId, name: 'Diseñador de prueba', roleName: 'disenador' },
    });
    await corePrisma.userProfile.create({
      data: { userId: plainClientUserId, name: 'Cliente de prueba', roleName: 'cliente' },
    });

    const moduleRef = await Test.createTestingModule({ imports: [CampaignsModule] }).compile();
    campaignsService = moduleRef.get(CampaignsService);
  });

  afterAll(async () => {
    await cleanDatabase();
    await corePrisma.$disconnect();
  });

  it('rechaza crear una campaña con un cmId sin perfil de Community Manager', async () => {
    await expect(
      campaignsService.createCampaign(
        { brandId, name: 'Campaña sin CM válido', cmId: designerUserId } as any,
        clientClaims,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('crea la campaña cuando el cmId corresponde a un perfil real de CM', async () => {
    const campaign = await campaignsService.createCampaign(
      { brandId, name: 'Campaña válida', cmId: cmUserId } as any,
      clientClaims,
    );
    expect(campaign.cmId).toBe(cmUserId);
  });

  it('no permite reasignar el cmId de una campaña ya creada (RF-2.3)', async () => {
    const campaign = await campaignsService.createCampaign(
      { brandId, name: 'Campaña para reasignar', cmId: cmUserId } as any,
      clientClaims,
    );

    await expect(
      campaignsService.updateCampaign(campaign.id, { cmId: otherCmUserId } as any, clientClaims),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Incluso reenviando el mismo cmId ya asignado se rechaza — no es un
    // no-op silencioso, es un campo bloqueado por completo tras la creación.
    await expect(
      campaignsService.updateCampaign(campaign.id, { cmId: cmUserId } as any, clientClaims),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza asignar un diseñador cuyo perfil no tiene rol de Diseñador', async () => {
    const campaign = await campaignsService.createCampaign(
      { brandId, name: 'Campaña para asignar diseñador', cmId: cmUserId } as any,
      clientClaims,
    );
    const cmClaims = { sub: cmUserId, role: 'community_manager' };

    await expect(campaignsService.assignDesigner(campaign.id, cmUserId, cmClaims)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const assigned = await campaignsService.assignDesigner(campaign.id, designerUserId, cmClaims);
    expect(assigned.userId).toBe(designerUserId);
  });

  it('los selectores eligible-* solo devuelven perfiles con el roleName correspondiente', async () => {
    const eligibleCms = await campaignsService.listEligibleCommunityManagers();
    const eligibleDesigners = await campaignsService.listEligibleDesigners();

    expect(eligibleCms.some((p: { userId: string }) => p.userId === cmUserId)).toBe(true);
    expect(eligibleCms.some((p: { userId: string }) => p.userId === plainClientUserId)).toBe(false);
    expect(eligibleCms.some((p: { userId: string }) => p.userId === designerUserId)).toBe(false);

    expect(eligibleDesigners.some((p: { userId: string }) => p.userId === designerUserId)).toBe(true);
    expect(eligibleDesigners.some((p: { userId: string }) => p.userId === plainClientUserId)).toBe(false);
    expect(eligibleDesigners.some((p: { userId: string }) => p.userId === cmUserId)).toBe(false);
  });

  describe('UserProfilesController.upsert — categorías/especialidades en updates parciales', () => {
    const upsertUserId = randomUUID();

    it('exige categorías/especialidades al crear un perfil de cm', async () => {
      await expect(
        profilesController.upsert({ userId: upsertUserId, name: 'CM nuevo', roleName: 'cm' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('crea el perfil cuando sí se envían categorías/especialidades', async () => {
      const profile = await profilesController.upsert({
        userId: upsertUserId,
        name: 'CM nuevo',
        roleName: 'cm',
        categoryIds: [categoryId],
        specialtyIds: [specialtyId],
      } as any);

      expect(profile.categories).toHaveLength(1);
      expect(profile.specialties).toHaveLength(1);
    });

    it('no exige reenviar categorías/especialidades en una actualización posterior', async () => {
      const updated = await profilesController.upsert({
        userId: upsertUserId,
        name: 'CM nuevo',
        avatarUrl: 'https://example.com/avatar.png',
        roleName: 'cm',
      } as any);

      expect(updated.avatarUrl).toBe('https://example.com/avatar.png');
      // Las categorías/especialidades ya existentes se conservan — no se
      // exige reenviarlas solo para cambiar avatarUrl.
      expect(updated.categories).toHaveLength(1);
      expect(updated.specialties).toHaveLength(1);
    });

    it('sí rechaza vaciar explícitamente las categorías de un perfil de cm', async () => {
      await expect(
        profilesController.upsert({
          userId: upsertUserId,
          name: 'CM nuevo',
          roleName: 'cm',
          categoryIds: [],
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
