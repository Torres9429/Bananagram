'use client';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import { downloadBlob } from '@repo/ui';

interface Props { brandId: string; canExport: boolean; }

export function ReportExporter({ brandId, canExport }: Props) {
  if (!canExport) return null;

  const download = async (format: 'csv' | 'pdf') => {
    const res = await fetch(`/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, format }),
    });
    const blob = await res.blob();
    downloadBlob(blob, `reporte-${brandId}.${format}`);
  };

  return (
    <ButtonGroup variant="outlined" size="small">
      <Button onClick={() => download('csv')}>Exportar CSV</Button>
      <Button onClick={() => download('pdf')}>Exportar PDF</Button>
    </ButtonGroup>
  );
}
