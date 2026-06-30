'use client';

import { CatalogList } from '../../../components/CatalogList';
import { MOCK_CATEGORIES } from '../../../lib/mock-data';

export default function CategoriesPage() {
  return <CatalogList title="Categorías" items={MOCK_CATEGORIES} />;
}
