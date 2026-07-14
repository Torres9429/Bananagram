'use client';

import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Alert from '@mui/material/Alert';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { ProtectedAction } from '@repo/ui/ui';
import { downloadBlob } from '@repo/ui/utils';
import { BrandTabs } from '../../../../components/BrandTabs';
import { MOCK_PROFILES } from '../../../../lib/mock-data';

export default function BrandReportsPage() {
  const params = useParams<{ id: string }>();
  const brand = MOCK_PROFILES.find((b) => b.id === params.id) ?? MOCK_PROFILES[0];

  function exportMock(format: 'csv' | 'pdf') {
    // Diseño sin backend: genera un archivo mock en el cliente, sin llamar API.
    const content =
      format === 'csv'
        ? `marca,score,consistencia,engagement,frecuencia\n${brand.name},${brand.score.score},${brand.score.consistency},${brand.score.engagement},${brand.score.frequency}\n`
        : `Reporte de ${brand.name} (mock, sin backend)`;
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/pdf' });
    downloadBlob(blob, `reporte-${brand.id}.${format}`);
  }

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <BrandTabs brandId={brand.id} />
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={700} mb={3}>Reportes — {brand.name}</Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Exportación simulada: genera el archivo en el navegador, sin consumir ningún servicio todavía.
        </Alert>
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3 }}>
          <Stack direction="row" gap={2} alignItems="center" mb={2}>
            <DescriptionOutlinedIcon sx={{ color: '#D4AC40' }} />
            <Box>
              <Typography variant="body1" fontWeight={600}>Reporte de desempeño</Typography>
              <Typography variant="caption" color="text.secondary">Score, consistencia, engagement y frecuencia del periodo actual.</Typography>
            </Box>
          </Stack>
          <ProtectedAction module="reports" action="export">
            <ButtonGroup variant="outlined" size="small">
              <Button onClick={() => exportMock('csv')}>Exportar CSV</Button>
              <Button onClick={() => exportMock('pdf')}>Exportar PDF</Button>
            </ButtonGroup>
          </ProtectedAction>
        </Paper>
      </Box>
    </Box>
  );
}
