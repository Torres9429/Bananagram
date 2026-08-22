import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Select, { type SelectProps } from '@mui/material/Select';

interface LabeledSelectProps extends Omit<SelectProps, 'label'> {
  label: string;
  children: ReactNode;
}

export function LabeledSelect({ label, children, ...props }: LabeledSelectProps) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 500, fontSize: 14 }}>
        {label}
      </Typography>

      <Select
        fullWidth
        variant="outlined"
        {...props}
        sx={{
          height: 44,
          borderRadius: 2,
          fontSize: 14,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.dark' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main', borderWidth: 2 },
          ...props.sx,
        }}
      >
        {children}
      </Select>
    </Box>
  );
}
