'use client';

import { SocialNetworkForm } from '../../../components/SocialNetworkForm';
import { MOCK_SOCIAL_NETWORKS } from '../../../lib/mock-data';

export default function SocialNetworksPage() {
  return <SocialNetworkForm items={MOCK_SOCIAL_NETWORKS} />;
}
