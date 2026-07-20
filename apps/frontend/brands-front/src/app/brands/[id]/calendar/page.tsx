'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { BrandTabs } from '../../../../components/BrandTabs';
import { MOCK_PROFILES, MOCK_CALENDAR_EVENTS, getSocialAccount, getSocialNetwork } from '../../../../lib/mock-data';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales: { es },
});

export default function BrandCalendarPage() {
  const params = useParams<{ id: string }>();
  const brand = MOCK_PROFILES.find((b) => b.id === params.id) ?? MOCK_PROFILES[0];

  const events = useMemo(
    () =>
      MOCK_CALENDAR_EVENTS.filter((e) => e.brandId === brand.id).map((e) => {
        const socialAccount = getSocialAccount(e.socialAccountId);
        const network = socialAccount ? getSocialNetwork(socialAccount.socialNetworkId) : undefined;
        return {
          id: e.id,
          title: `${e.title} · ${network?.label ?? '—'}`,
          start: new Date(e.start),
          end: new Date(e.end),
        };
      }),
    [brand.id],
  );

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <BrandTabs brandId={brand.id} />
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={700} mb={3}>Calendario — {brand.name}</Typography>
        <Box sx={{ bgcolor: '#fff', border: '1px solid #E8E8E8', borderRadius: 3, p: 2, height: 620 }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            culture="es"
          />
        </Box>
      </Box>
    </Box>
  );
}
