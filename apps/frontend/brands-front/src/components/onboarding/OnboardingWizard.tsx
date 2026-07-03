'use client';

// LEGACY/DEPRECATED (dominio v3): el registro ya crea el Perfil directamente
// (§A.2 del análisis de dominio) y /onboarding redirige a /profile — este
// wizard ya no forma parte de ningún flujo alcanzable. Se conserva sin borrar
// por si alguno de sus steps se reutiliza más adelante; candidato a eliminar
// por completo en una fase futura de limpieza de dominio v3.
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
  MOCK_PROFILES,
  MOCK_CAMPAIGNS,
  MOCK_SOCIAL_ACCOUNTS,
  assignTeamToCampaign,
  type MockAvailableCM,
  type SocialNetworkCode,
} from '../../lib/mock-data';
import { StepProfile, type ProfileDraft } from './steps/StepProfile';
import { StepNetworks } from './steps/StepNetworks';
import { StepCampaign, type CampaignDraft } from './steps/StepCampaign';
import { StepSelectCM } from './steps/StepSelectCM';
import { StepConfirmation } from './steps/StepConfirmation';

const STEPS = ['Crear perfil', 'Redes sociales', 'Campaña', 'Community Manager', 'Confirmación'];
const BRANDS_FRONT_URL = 'http://localhost:3013';

export function OnboardingWizard() {
  const router = useRouter();

  const [activeStep, setActiveStep] = useState(0);

  const [profile, setProfile] = useState<ProfileDraft>({ name: '', type: 'brand', category: '' });
  const [networks, setNetworks] = useState<SocialNetworkCode[]>([]);
  const [campaign, setCampaign] = useState<CampaignDraft>({ name: '', startDate: '', endDate: '', objective: '' });
  const [selectedCM, setSelectedCM] = useState<MockAvailableCM | null>(null);

  function canAdvance(): boolean {
    switch (activeStep) {
      case 0: return profile.name.trim() !== '' && profile.category !== '';
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

    const newProfileId = `b${Date.now()}`;
    const defaultScore = {
      score: 0, consistency: 0, engagement: 0, coverage: 0,
      frequency: 0, classification: 'bajo' as const, snapshotDate: new Date().toLocaleDateString('es-MX'),
    };

    // Añadimos el perfil a los mocks en memoria.
    MOCK_PROFILES.push({
      id: newProfileId,
      name: profile.name,
      type: profile.type,
      color: '#E0A800',
      category: profile.category,
      activeCampaigns: 1,
      score: defaultScore,
      profiles: networks.map((code, i) => ({
        id: `bp-new-${i}`,
        brandId: newProfileId,
        socialNetwork: code,
        handle: `@${profile.name.toLowerCase().replace(/\s/g, '')}`,
        followers: 0,
        active: true,
      })),
    });

    // Añadimos las SocialAccount al array global.
    const newSocialAccounts = networks.map((code, i) => ({
      id: `bp-new-${i}`,
      brandId: newProfileId,
      socialNetwork: code,
      handle: `@${profile.name.toLowerCase().replace(/\s/g, '')}`,
      followers: 0,
      active: true,
    }));
    MOCK_SOCIAL_ACCOUNTS.push(...newSocialAccounts);

    // Campaña.
    const newCampaignId = `c-new-${Date.now()}`;
    MOCK_CAMPAIGNS.push({
      id: newCampaignId,
      brandId: newProfileId,
      name: campaign.name,
      status: 'active',
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      postsCount: 0,
      socialAccountIds: [],
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

    // Navegar a la vista del perfil recién creado.
    // La cookie bananagram_token viaja automáticamente con la navegación.
    window.location.href = `${BRANDS_FRONT_URL}/brands/${newProfileId}`;
  }

  const stepContent = [
    <StepProfile key="profile" value={profile} onChange={setProfile} />,
    <StepNetworks key="networks" selected={networks} onChange={setNetworks} />,
    <StepCampaign key="campaign" value={campaign} onChange={setCampaign} profileName={profile.name || 'tu perfil'} />,
    <StepSelectCM key="cm" category={profile.category} selectedCMId={selectedCM?.id ?? null} onChange={setSelectedCM} />,
    <StepConfirmation key="confirm" profile={profile} networks={networks} campaign={campaign} cm={selectedCM} />,
  ];

  const isLastStep = activeStep === STEPS.length - 1;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F7F7F7', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #E8E8E8', px: 3, py: 2 }}>
        <Stack direction="row" alignItems="center" gap={2}>
          <Image src="/LogoNameMonkey.png" alt="Bananagram" width={1146} height={308} style={{ width: 120, height: 'auto' }} />
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
              '& .MuiStepIcon-root.Mui-active': { color: '#E0A800' },
              '& .MuiStepIcon-root.Mui-completed': { color: '#E0A800' },
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
                sx={{ bgcolor: '#E0A800', color: '#7A5C00', '&:hover': { bgcolor: '#D4AC40' } }}
              >
                Ir a mi perfil →
              </Button>
            ) : (
              <Button
                variant="contained"
                disabled={!canAdvance()}
                onClick={handleNext}
                sx={{ bgcolor: '#E0A800', color: '#7A5C00', '&:hover': { bgcolor: '#D4AC40' }, '&:disabled': { bgcolor: '#E8E8E8', color: '#AAAAAA' } }}
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
