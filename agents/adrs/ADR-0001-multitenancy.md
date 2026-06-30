# ADR-0001 — Multi-tenancy por row-level (brand_id)

**Decisión**: Discriminator column sobre schema-per-tenant y database-per-tenant.

**Razón**: Simplicidad con Prisma y volumen esperado.

**Consecuencia**: Todas las tablas de negocio tienen `brand_id UUID NOT NULL` FK → brands.
Los guards validan que el brand_id del recurso esté en el brandIds[] del JWT.
