'use client';

import { CatalogList } from '../../../components/CatalogList';
import { MOCK_SPECIALTIES } from '../../../lib/mock-data';

export default function SpecialtiesPage() {
  return <CatalogList title="Especialidades" items={MOCK_SPECIALTIES} />;
}
