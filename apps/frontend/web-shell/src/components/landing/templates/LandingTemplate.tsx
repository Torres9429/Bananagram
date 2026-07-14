'use client';

import Box from '@mui/material/Box';
import { JungleBackdrop } from '../organisms/JungleBackdrop';
import { Header } from '../organisms/Header';
import { HeroSection } from '../organisms/HeroSection';
import { CampaignsSection } from '../organisms/CampaignsSection';
import { PublicationsSection } from '../organisms/PublicationsSection';
import { CalendarSection } from '../organisms/CalendarSection';
import { MetricsSection } from '../organisms/MetricsSection';
import { CollaborationSection } from '../organisms/CollaborationSection';
import { ContactSection } from '../organisms/ContactSection';
import { Footer } from '../organisms/Footer';

/** JungleBackdrop queda fijo (position: fixed) detrás de todo; el resto del contenido se apila encima con z-index. */
export function LandingTemplate() {
  return (
    <Box sx={{ position: 'relative' }}>
      <JungleBackdrop />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Header />
        <Box component="main">
          <HeroSection />
          <CampaignsSection />
          <PublicationsSection />
          <CalendarSection />
          <MetricsSection />
          <CollaborationSection />
          <ContactSection />
        </Box>
        <Footer />
      </Box>
    </Box>
  );
}
