const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Mismos slugs que apps/backend/commons/types/modules.enum.ts / actions.enum.ts / roles.enum.ts
// — nunca hardcodear permisos en el código, viven en role_permissions (ver CLAUDE.md).
const MODULES = [
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
    publicaciones: ['ver', 'crear', 'editar'],
    calendario: ['ver', 'crear', 'editar'],
    campanas: ['ver', 'crear', 'editar', 'asignar'],
    metricas: ['ver'],
    score: ['ver'],
    reportes: ['ver'],
  },
  disenador: {
    publicaciones: ['ver', 'crear'],
    calendario: ['ver'],
    campanas: ['ver'],
  },
  cliente: {
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
const USERS = [
  { email: 'admin@bananagram.mx', password: 'admin123', firstName: 'Laura', lastName: 'Méndez', role: 'administrador' },
  { email: 'cm@bananagram.mx', password: 'cm123456', firstName: 'Ana', lastName: 'García', role: 'community_manager' },
  { email: 'disenador@bananagram.mx', password: 'diseno123', firstName: 'Carlos', lastName: 'Ruiz', role: 'disenador' },
  { email: 'cliente@bananagram.mx', password: 'cliente123', firstName: 'Roberto', lastName: 'Fernández', role: 'cliente' },
  { email: 'alex@bananagram.mx', password: 'alex12345', firstName: 'Alex', lastName: 'Rivera', role: 'cliente' },
];

const CATEGORIES = ['Moda', 'Deportes', 'Tecnología', 'Entretenimiento', 'Gastronomía', 'Salud', 'Educación', 'Arte'];

const SPECIALTIES = ['Diseño gráfico', 'Copywriting', 'Video y edición', 'Fotografía', 'Paid media', 'SEO/SEM', 'Animación'];

const SOCIAL_NETWORKS = [
  { code: 'IG', name: 'Instagram', baseEngagementRate: 0.045 },
  { code: 'TK', name: 'TikTok', baseEngagementRate: 0.09 },
  { code: 'FB', name: 'Facebook', baseEngagementRate: 0.02 },
  { code: 'X', name: 'X', baseEngagementRate: 0.015 },
  { code: 'LI', name: 'LinkedIn', baseEngagementRate: 0.025 },
  { code: 'YT', name: 'YouTube', baseEngagementRate: 0.03 },
];

async function seedModulesAndActions() {
  const modulesBySlug = {};
  for (const m of MODULES) {
    modulesBySlug[m.slug] = await prisma.module.upsert({ where: { slug: m.slug }, update: { name: m.name }, create: m });
  }
  const actionsBySlug = {};
  for (const a of ACTIONS) {
    actionsBySlug[a.slug] = await prisma.action.upsert({ where: { slug: a.slug }, update: { name: a.name }, create: a });
  }
  return { modulesBySlug, actionsBySlug };
}

async function seedRolesAndPermissions(modulesBySlug, actionsBySlug) {
  const rolesByName = {};
  for (const name of ROLES) {
    rolesByName[name] = await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
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
        await prisma.rolePermission.upsert({
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

async function seedUsers(rolesByName) {
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { firstName: u.firstName, lastName: u.lastName, roleId: rolesByName[u.role].id },
      create: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        roleId: rolesByName[u.role].id,
      },
    });
  }
}

async function seedCatalogs() {
  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of SPECIALTIES) {
    await prisma.specialty.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const n of SOCIAL_NETWORKS) {
    await prisma.socialNetwork.upsert({
      where: { code: n.code },
      update: { name: n.name, baseEngagementRate: n.baseEngagementRate },
      create: n,
    });
  }
}

async function main() {
  console.log('🌱 Seed: módulos y acciones...');
  const { modulesBySlug, actionsBySlug } = await seedModulesAndActions();

  console.log('🌱 Seed: roles y permisos...');
  const rolesByName = await seedRolesAndPermissions(modulesBySlug, actionsBySlug);

  console.log('🌱 Seed: usuarios de prueba...');
  await seedUsers(rolesByName);

  console.log('🌱 Seed: catálogos (categorías, especialidades, redes sociales)...');
  await seedCatalogs();

  console.log('✅ Seed completo. Cuentas de prueba (mismas que el modo mock del frontend):');
  for (const u of USERS) {
    console.log(`   ${u.email} / ${u.password} (${u.role})`);
  }
}

main()
  .catch((err) => {
    console.error('❌ Seed falló:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
