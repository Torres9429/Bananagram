import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
interface Props { title: string; description?: string; action?: React.ReactNode; }
export function EmptyState({ title, description, action }: Props) {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography variant="h6" color="text.secondary">{title}</Typography>
      {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{description}</Typography>}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}
