import MuiChip from '@mui/material/Chip';
import type { ChipProps } from '../../../interfaces/interface';

/** Wrapper delgado sobre MUI Chip (etiquetas de canal / feature tags), apoyado en el override MuiChip ya definido en el theme. */
export function Chip({ tone = 'neutral', sx, ...props }: ChipProps) {
  const sxArray = Array.isArray(sx) ? sx : [sx];

  if (tone === 'neutral') {
    return <MuiChip size="small" variant="outlined" sx={[{ fontWeight: 600 }, ...sxArray]} {...props} />;
  }

  return (
    <MuiChip
      size="small"
      variant="filled"
      color={tone}
      sx={[{ fontWeight: 600 }, ...sxArray]}
      {...props}
    />
  );
}
