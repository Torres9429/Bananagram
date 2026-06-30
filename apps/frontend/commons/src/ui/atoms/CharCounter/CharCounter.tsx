import Typography from '@mui/material/Typography';

const LIMITS: Record<string, number> = {
  x: 280, instagram: 2200, linkedin: 3000, facebook: 63206, tiktok: 2200,
};

interface Props { network: string; current: number; }

export function CharCounter({ network, current }: Props) {
  const limit = LIMITS[network] || 2200;
  const remaining = limit - current;
  const color = remaining < 20 ? 'error.main' : remaining < 100 ? 'primary.dark' : '#6B6B6B';
  return (
    <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', color }}>
      {remaining} / {limit}
    </Typography>
  );
}
