import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField, { type TextFieldProps } from '@mui/material/TextField';

interface LabeledFieldProps extends Omit<TextFieldProps, 'label'> {
  label: string;
}

export function LabeledField({ label, multiline, rows, ...props }: LabeledFieldProps) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 500, fontSize: 14 }}>
        {label}
      </Typography>

      <TextField
        fullWidth
        variant="outlined"
        multiline={multiline}
        rows={rows}
        {...props}
        sx={{
          '& .MuiOutlinedInput-root': {
            // altura fija solo para campos de una línea
            ...(multiline ? {} : { height: 44 }),
            borderRadius: 2,
            '& fieldset': { borderColor: 'divider' },
            '&:hover fieldset': { borderColor: 'primary.dark' },
            '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 2 },
          },
          '& .MuiOutlinedInput-input': {
            ...(multiline ? { py: 1.5 } : { py: 0, height: '44px', boxSizing: 'border-box' }),
            fontSize: 14,
          },
          ...props.sx,
        }}
      />
    </Box>
  );
}
