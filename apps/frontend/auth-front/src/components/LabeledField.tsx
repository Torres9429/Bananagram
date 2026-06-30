import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField, { TextFieldProps } from '@mui/material/TextField';

interface LabeledFieldProps extends Omit<TextFieldProps, 'label'> {
  label: string;
}

export function LabeledField({ label, ...props }: LabeledFieldProps) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        variant="subtitle2"
        sx={{
          mb: 0.75,
          fontWeight: 500,
          fontSize: 14,
        }}
      >
        {label}
      </Typography>

      <TextField
        fullWidth
        variant="outlined"
        {...props}
        sx={{
          '& .MuiOutlinedInput-root': {
            height: 44,
            borderRadius: 2,

            // Borde normal
            '& fieldset': {
              borderColor: '#D9D9D9',
            },

            // Hover
            '&:hover fieldset': {
              borderColor: '#FFCB3D',
            },

            // Focus (clic)
            '&.Mui-focused fieldset': {
              borderColor: '#FFCB3D',
              borderWidth: 2,
            },
          },

          '& .MuiOutlinedInput-input': {
            py: 0,
            height: '44px',
            boxSizing: 'border-box',
            fontSize: 14,
          },

          ...props.sx,
        }}
      />
    </Box>
  );
}
