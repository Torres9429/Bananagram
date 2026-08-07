const { PrismaClient: AuthPrismaClient } = require('../../../apps/backend/services/auth-service/node_modules/.prisma-client');
const { PrismaClient: CorePrismaClient } = require('../../../apps/backend/services/core-service/node_modules/.prisma-client');
const argon2 = require('argon2');

// auth-service y core-service ya no comparten base de datos (ver
// docs/base/modelo2.txt) — el seed necesita un Prisma Client por servicio,
// cada uno generado desde su propio schema.prisma.
const authPrisma = new AuthPrismaClient();
const corePrisma = new CorePrismaClient();

// Mismos slugs que apps/backend/commons/types/modules.enum.ts / actions.enum.ts / roles.enum.ts
// — nunca hardcodear permisos en el código, viven en role_permissions (ver CLAUDE.md).
const MODULES = [
  { slug: 'catalogos', name: 'Catálogos' },
  { slug: 'marcas', name: 'Marcas' },
  { slug: 'publicaciones', name: 'Publicaciones' },
  { slug: 'calendario', name: 'Calendario' },
  { slug: 'campanas', name: 'Campañas' },
  { slug: 'metricas', name: 'Métricas' },
  { slug: 'score', name: 'Score' },
  { slug: 'reportes', name: 'Reportes' },
  { slug: 'usuarios', name: 'Usuarios' },
  { slug: 'privilegios', name: 'Privilegios' },
];

const ACTIONS = [
  { slug: 'ver', name: 'Ver' },
  { slug: 'crear', name: 'Crear' },
  { slug: 'editar', name: 'Editar' },
  { slug: 'eliminar', name: 'Eliminar' },
  { slug: 'aprobar', name: 'Aprobar' },
  { slug: 'rechazar', name: 'Rechazar' },
  { slug: 'exportar', name: 'Exportar' },
  { slug: 'configurar', name: 'Configurar' },
  { slug: 'asignar', name: 'Asignar' },
];

const ROLES = ['administrador', 'community_manager', 'disenador', 'cliente'];

// module -> acciones permitidas, por rol. administrador siempre recibe todas
// (ver más abajo); el resto refleja lo que cada rol necesita para operar.
const ROLE_PERMISSIONS = {
  community_manager: {
    catalogos: ['ver'],
    marcas: ['ver'],
    publicaciones: ['ver', 'crear', 'editar'],
    calendario: ['ver', 'crear', 'editar'],
    campanas: ['ver', 'crear', 'editar', 'asignar'],
    metricas: ['ver'],
    score: ['ver'],
    reportes: ['ver'],
  },
  disenador: {
    catalogos: ['ver'],
    marcas: ['ver'],
    publicaciones: ['ver', 'crear'],
    calendario: ['ver'],
    campanas: ['ver'],
  },
  cliente: {
    catalogos: ['ver'],
    marcas: ['ver', 'crear', 'editar'],
    publicaciones: ['ver', 'aprobar', 'rechazar'],
    calendario: ['ver'],
    campanas: ['ver', 'crear'],
    metricas: ['ver'],
    score: ['ver'],
    reportes: ['ver', 'exportar'],
  },
};

// Mismos usuarios/credenciales que apps/frontend/commons/src/mocks/mock-users.ts,
// para que el login real (una vez conectado el front al backend) siga
// funcionando con las mismas cuentas de prueba que ya usa el modo mock.
// firstName/lastName ya no viven en auth-service.User (ver modelo2.txt) —
// se usan para componer UserProfile.name en core-service.
// roles es un array (multi-rol, ver auth-service UserRole) — hasta ahora
// cada usuario de prueba tenía exactamente uno; multi@bananagram.mx es el
// único con dos, para demostrar la unión de permisos en vivo.
const USERS = [
  { email: '20233tn102@utez.edu.mx', password: 'admin123', firstName: 'Laura', lastName: 'Méndez', roles: ['administrador'] },
  { email: 'cm@bananagram.mx', password: 'cm123456', firstName: 'Ana', lastName: 'García', roles: ['community_manager'] },
  { email: 'disenador@bananagram.mx', password: 'diseno123', firstName: 'Carlos', lastName: 'Ruiz', roles: ['disenador'] },
  { email: 'cliente@bananagram.mx', password: 'cliente123', firstName: 'Roberto', lastName: 'Fernández', roles: ['cliente'] },
  { email: 'alex@bananagram.mx', password: 'alex12345', firstName: 'Alex', lastName: 'Rivera', roles: ['cliente'] },
  { email: 'multi@bananagram.mx', password: 'multi12345', firstName: 'Sofía', lastName: 'Delgado', roles: ['community_manager', 'disenador'] },
];

async function seedModulesAndActions() {
  const modulesBySlug = {};
  for (const m of MODULES) {
    modulesBySlug[m.slug] = await authPrisma.module.upsert({ where: { slug: m.slug }, update: { name: m.name }, create: m });
  }
  const actionsBySlug = {};
  for (const a of ACTIONS) {
    actionsBySlug[a.slug] = await authPrisma.action.upsert({ where: { slug: a.slug }, update: { name: a.name }, create: a });
  }
  return { modulesBySlug, actionsBySlug };
}

async function seedRolesAndPermissions(modulesBySlug, actionsBySlug) {
  const rolesByName = {};
  for (const name of ROLES) {
    rolesByName[name] = await authPrisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const roleName of ROLES) {
    const role = rolesByName[roleName];
    // administrador: acceso total (todos los módulos, todas las acciones).
    const grants =
      roleName === 'administrador'
        ? Object.fromEntries(MODULES.map((m) => [m.slug, ACTIONS.map((a) => a.slug)]))
        : ROLE_PERMISSIONS[roleName];

    for (const [moduleSlug, actionSlugs] of Object.entries(grants)) {
      for (const actionSlug of actionSlugs) {
        await authPrisma.rolePermission.upsert({
          where: {
            roleId_moduleId_actionId: {
              roleId: role.id,
              moduleId: modulesBySlug[moduleSlug].id,
              actionId: actionsBySlug[actionSlug].id,
            },
          },
          update: { allowed: true },
          create: {
            roleId: role.id,
            moduleId: modulesBySlug[moduleSlug].id,
            actionId: actionsBySlug[actionSlug].id,
            allowed: true,
          },
        });
      }
    }
  }

  return rolesByName;
}

// Mismo criterio que ROLE_NAME_TO_SHORT (auth-service/profile.service.ts) y
// REGISTER_ROLE_MAP (auth.service.ts) — 'cliente'|'cm'|'disenador', los
// mismos valores que espera UserProfile.roleName en core-service.
// administrador -> null: un Admin nunca tiene perfil de CM/Diseñador.
const ROLE_TO_PROFILE_ROLE_NAME = {
  administrador: null,
  community_manager: 'cm',
  disenador: 'disenador',
  cliente: 'cliente',
};

async function seedUsers(rolesByName) {
  for (const u of USERS) {
    const passwordHash = await argon2.hash(u.password);
    const user = await authPrisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, passwordHash },
    });

    // Multi-rol: se reconcilian los UserRole del usuario en cada corrida
    // (deleteMany + createMany) en vez de un upsert por rol — idempotente
    // y sin dejar roles viejos colgados si un rerun del seed le quita uno.
    await authPrisma.userRole.deleteMany({ where: { userId: user.id } });
    await authPrisma.userRole.createMany({
      data: u.roles.map((roleName) => ({ userId: user.id, roleId: rolesByName[roleName].id })),
    });

    // El nombre para mostrar vive en UserProfile, en la base de core-service
    // (distinta de la de auth-service) — enlazado por userId, sin FK real.
    // roleNames es lo que CampaignsService.assertUserHasRole/listProfilesByRole
    // usa para validar cmId/designerId y listar CM/Diseñador elegibles — sin
    // esto, los usuarios demo no pueden usarse en campañas aunque el seed
    // los haya creado. administrador no tiene perfil de CM/Diseñador, así
    // que se filtra (ROLE_TO_PROFILE_ROLE_NAME[...] === null para ese caso).
    const roleNames = u.roles.map((roleName) => ROLE_TO_PROFILE_ROLE_NAME[roleName]).filter(Boolean);
    await corePrisma.userProfile.upsert({
      where: { userId: user.id },
      update: { name: `${u.firstName} ${u.lastName}`, roleNames },
      create: { userId: user.id, name: `${u.firstName} ${u.lastName}`, roleNames },
    });
  }
}

async function main() {
  console.log('🌱 Seed: módulos y acciones...');
  const { modulesBySlug, actionsBySlug } = await seedModulesAndActions();

  console.log('🌱 Seed: roles y permisos...');
  const rolesByName = await seedRolesAndPermissions(modulesBySlug, actionsBySlug);

  console.log('🌱 Seed: usuarios de prueba (auth-service) + perfiles (core-service)...');
  await seedUsers(rolesByName);

  console.log('✅ Seed completo. Cuentas de prueba (mismas que el modo mock del frontend):');
  for (const u of USERS) {
    console.log(`   ${u.email} / ${u.password} (${u.roles.join(', ')})`);
  }
}

main()
  .catch((err) => {
    console.error('❌ Seed falló:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await authPrisma.$disconnect();
    await corePrisma.$disconnect();
  });
