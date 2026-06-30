import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';

interface Props {
  variant?: 'rows' | 'card';
  count?: number;
}

export function SkeletonLoader({ variant = 'rows', count = 3 }: Props) {
  if (variant === 'card') {
    return (
      <Stack gap={2}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 3 }} />
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap={1.5}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: 2 }} />
      ))}
    </Stack>
  );
}
