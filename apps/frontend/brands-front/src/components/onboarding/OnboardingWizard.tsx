'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import MuiStepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Image from 'next/image';
import {
  MOCK_BRANDS,
  MOCK_CAMPAIGNS,
  MOCK_BRAND_PROFILES,
  assignTeamToCampaign,
  type MockAvailableCM,
  type SocialNetworkCode,
} from '../../lib/mock-data';
import { StepBrand, type BrandDraft } from './steps/StepBrand';
import { StepNetworks } from './steps/StepNetworks';
import { StepCampaign, type CampaignDraft } from './steps/StepCampaign';
import { StepSelectCM } from './steps/StepSelectCM';
import { StepConfirmation } from './steps/StepConfirmation';

const STEPS = ['Crear marca', 'Redes sociales', 'Campaña', 'Community Manager', 'Confirmación'];
const BRANDS_FRONT_URL = 'http://localhost:3013';

export function OnboardingWizard() {
  const router = useRouter();

  const [activeStep, setActiveStep] = useState(0);

  const [brand, setBrand] = useState<BrandDraft>({ name: '', type: 'brand', category: '' });
  const [networks, setNetworks] = useState<SocialNetworkCode[]>([]);
  const [campaign, setCampaign] = useState<CampaignDraft>({ name: '', startDate: '', endDate: '', objective: '' });
  const [selectedCM, setSelectedCM] = useState<MockAvailableCM | null>(null);

  function canAdvance(): boolean {
    switch (activeStep) {
      case 0: return brand.name.trim() !== '' && brand.category !== '';
      case 1: return networks.length > 0;
      case 2: return campaign.name.trim() !== '' && campaign.startDate !== '' && campaign.endDate !== '';
      case 3: return selectedCM !== null;
      default: return true;
    }
  }

  function handleNext() {
    if (!canAdvance()) return;
    setActiveStep((s) => s + 1);
  }

  function handleBack() {
    setActiveStep((s) => s - 1);
  }

  function handleFinish() {
    // Mock: creamos los datos en memoria (sin persistencia en backend).
    // En producción: POST /brands → POST /brand-profiles (por cada red) →
    // POST /campaigns → POST /campaign-team { cmId }.

    const newBrandId = `b${Date.now()}`;
    const defaultScore = {
      score: 0, consistency: 0, engagement: 0, coverage: 0,
      frequency: 0, classification: 'bajo' as const, snapshotDate: new Date().toLocaleDateString('es-MX'),
    };

    // Añadimos la marca a los mocks en memoria.
    MOCK_BRANDS.push({
      id: newBrandId,
      name: brand.name,
      type: brand.type,
      color: '#FDC726',
      category: brand.category,
      activeCampaigns: 1,
      score: defaultScore,
      profiles: networks.map((code, i) => ({
        id: `bp-new-${i}`,
        brandId: newBrandId,
        socialNetwork: code,
        handle: `@${brand.name.toLowerCase().replace(/\s/g, '')}`,
        followers: 0,
        active: true,
      })),
    });

    // Añadimos los BrandProfiles al array global.
    const newProfiles = networks.map((code, i) => ({
      id: `bp-new-${i}`,
      brandId: newBrandId,
      socialNetwork: code,
      handle: `@${brand.name.toLowerCase().replace(/\s/g, '')}`,
      followers: 0,
      active: true,
    }));
    MOCK_BRAND_PROFILES.push(...newProfiles);

    // Campaña.
    const newCampaignId = `c-new-${Date.now()}`;
    MOCK_CAMPAIGNS.push({
      id: newCampaignId,
      brandId: newBrandId,
      name: campaign.name,
      status: 'active',
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      postsCount: 0,
    });

    // Team (CM).
    if (selectedCM) {
      assignTeamToCampaign(newCampaignId, [
        {
          id: selectedCM.id,
          name: selectedCM.name,
          role: 'Community Manager',
          avatarBg: selectedCM.avatarBg,
          avatarColor: selectedCM.avatarColor,
        },
      ]);
    }

    // Navegar a la vista de la marca recién creada.
    // La cookie bananagram_token viaja automáticamente con la navegación.
    window.location.href = `${BRANDS_FRONT_URL}/brands/${newBrandId}`;
  }

  const stepContent = [
    <StepBrand key="brand" value={brand} onChange={setBrand} />,
    <StepNetworks key="networks" selected={networks} onChange={setNetworks} />,
    <StepCampaign key="campaign" value={campaign} onChange={setCampaign} brandName={brand.name || 'tu marca'} />,
    <StepSelectCM key="cm" category={brand.category} selectedCMId={selectedCM?.id ?? null} onChange={setSelectedCM} />,
    <StepConfirmation key="confirm" brand={brand} networks={networks} campaign={campaign} cm={selectedCM} />,
  ];

  const isLastStep = activeStep === STEPS.length - 1;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F7F7F7', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #E8E8E8', px: 3, py: 2 }}>
        <Stack direction="row" alignItems="center" gap={2}>
          <Image src="/LogoName.png" alt="Bananagram" width={1146} height={308} style={{ width: 120, height: 'auto' }} />
          <Typography variant="caption" color="text.secondary">
            Configura tu cuenta
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', p: 3, pt: 5 }}>
        <Box sx={{ width: '100%', maxWidth: 640 }}>
          {/* Stepper */}
          <MuiStepper
            activeStep={activeStep}
            alternativeLabel
            sx={{
              mb: 4,
              '& .MuiStepLabel-label': { fontSize: 12 },
              '& .MuiStepIcon-root.Mui-active': { color: '#FDC726' },
              '& .MuiStepIcon-root.Mui-completed': { color: '#FDC726' },
            }}
          >
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </MuiStepper>

          {/* Card de paso */}
          <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: { xs: 3, md: 4 }, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={0.5}>
              {STEPS[activeStep]}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
              Paso {activeStep + 1} de {STEPS.length}
            </Typography>

            {stepContent[activeStep]}
          </Paper>

          {/* Navegación */}
          <Stack direction="row" justifyContent="space-between">
            <Button
              variant="outlined"
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ borderColor: '#E8E8E8', color: '#6B6B6B' }}
            >
              ← Atrás
            </Button>

            {isLastStep ? (
              <Button
                variant="contained"
                onClick={handleFinish}
                sx={{ bgcolor: '#FDC726', color: '#7A5C00', '&:hover': { bgcolor: '#D4AC40' } }}
              >
                Ir a mi marca →
              </Button>
            ) : (
              <Button
                variant="contained"
                disabled={!canAdvance()}
                onClick={handleNext}
                sx={{ bgcolor: '#FDC726', color: '#7A5C00', '&:hover': { bgcolor: '#D4AC40' }, '&:disabled': { bgcolor: '#E8E8E8', color: '#AAAAAA' } }}
              >
                Siguiente →
              </Button>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
