'use client';

import { CatalogList } from '../../../components/CatalogList';
import { MOCK_SOCIAL_NETWORKS } from '../../../lib/mock-data';

export default function SocialNetworksPage() {
  return <CatalogList title="Redes sociales" items={MOCK_SOCIAL_NETWORKS} />;
}
