import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';

interface ProfileCompletenessBadgeProps {
  isComplete: boolean;
  onComplete?: () => void;
}

export function ProfileCompletenessBadge({ isComplete, onComplete }: ProfileCompletenessBadgeProps) {
  if (isComplete) return null;

  return (
    <Alert
      severity="warning"
      icon={<AccountCircleOutlinedIcon />}
      sx={{ borderRadius: 2, mb: 3 }}
      action={
        onComplete ? (
          <Button size="small" color="inherit" onClick={onComplete} sx={{ fontWeight: 700 }}>
            Completar perfil
          </Button>
        ) : undefined
      }
    >
      <AlertTitle sx={{ fontWeight: 700 }}>Perfil incompleto</AlertTitle>
      Agrega tus categorías y especialidades para aparecer en las búsquedas del sistema y poder ser asignado a nuevas campañas.
    </Alert>
  );
}
