import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CampaignsModule } from '../services/core-service/src/campaigns/campaigns.module';
import { CampaignsService } from '../services/core-service/src/campaigns/campaigns.service';
import { UserProfilesController } from '../services/core-service/src/internal/user-profiles.controller';
import { prisma as corePrisma } from '../services/core-service/src/prisma/client';
import { cleanDatabase } from './helpers/db.helper';
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';

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

  const clientClaims = { sub: clientUserId, roles: ['cliente'] };

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
      data: { userId: cmUserId, name: 'CM de prueba', roleNames: ['cm'] },
    });
    await corePrisma.userProfile.create({
      data: { userId: otherCmUserId, name: 'Otro CM de prueba', roleNames: ['cm'] },
    });
    await corePrisma.userProfile.create({
      data: { userId: designerUserId, name: 'Diseñador de prueba', roleNames: ['disenador'] },
    });
    await corePrisma.userProfile.create({
      data: { userId: plainClientUserId, name: 'Cliente de prueba', roleNames: ['cliente'] },
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

  it('permite reasignar el cmId mientras el CM no haya aceptado, y lo bloquea después de aceptar (RF-2.3, relajada en la Fase J)', async () => {
    const campaign = await campaignsService.createCampaign(
      { brandId, name: 'Campaña para reasignar', cmId: cmUserId } as any,
      clientClaims,
    );

    // Pendiente todavía: reasignar SÍ funciona — el Cliente necesita poder
    // elegir otro CM si el primero rechaza (o antes de que responda), sin
    // esperar a que "acepte" primero.
    const reassigned = await campaignsService.updateCampaign(
      campaign.id,
      { cmId: otherCmUserId } as any,
      clientClaims,
    );
    expect(reassigned.cmId).toBe(otherCmUserId);
    expect(reassigned.cmStatus).toBe('pendiente');

    const otherCmClaims = { sub: otherCmUserId, roles: ['community_manager'] };
    await campaignsService.acceptCampaign(campaign.id, otherCmClaims);

    // Ya aceptada: ahora sí queda bloqueado por completo, incluso reenviando
    // el mismo cmId ya asignado — no es un no-op silencioso.
    await expect(
      campaignsService.updateCampaign(campaign.id, { cmId: otherCmUserId } as any, clientClaims),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('assignDesigner exige que la campaña esté aceptada y que el diseñador ya esté en el equipo general del CM', async () => {
    const campaign = await campaignsService.createCampaign(
      { brandId, name: 'Campaña para asignar diseñador', cmId: cmUserId } as any,
      clientClaims,
    );
    const cmClaims = { sub: cmUserId, roles: ['community_manager'] };

    // Bloqueado mientras el CM no aceptó (regla nueva de la Fase J2): no se
    // arma equipo de una campaña todavía no confirmada.
    await expect(campaignsService.assignDesigner(campaign.id, designerUserId, cmClaims)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    await campaignsService.acceptCampaign(campaign.id, cmClaims);

    // Ya aceptada, pero el diseñador todavía no está en el equipo GENERAL
    // del CM (CmTeamMember) — la validación de rol 'disenador' vive ahí
    // (POST /me/team, Fase J5), no en assignDesigner.
    await expect(campaignsService.assignDesigner(campaign.id, designerUserId, cmClaims)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    await corePrisma.cmTeamMember.create({ data: { cmUserId, designerUserId } });

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
        profilesController.upsert({ userId: upsertUserId, name: 'CM nuevo', roleNames: ['cm'] } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('crea el perfil cuando sí se envían categorías/especialidades', async () => {
      const profile = await profilesController.upsert({
        userId: upsertUserId,
        name: 'CM nuevo',
        roleNames: ['cm'],
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
        roleNames: ['cm'],
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
          roleNames: ['cm'],
          categoryIds: [],
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
