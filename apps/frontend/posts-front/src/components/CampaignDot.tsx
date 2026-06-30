import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface CampaignDotProps {
  color: string;
  name: string;
}

export function CampaignDot({ color, name }: CampaignDotProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
      <Typography variant="caption" color="text.secondary">
        {name}
      </Typography>
    </Box>
  );
}
