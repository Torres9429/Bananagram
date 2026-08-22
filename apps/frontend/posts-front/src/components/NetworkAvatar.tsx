import Avatar from '@mui/material/Avatar';
import type { NetworkAvatarProps } from '../interfaces/interface';

export function NetworkAvatar({ network, networkBg, networkColor, size = 36 }: NetworkAvatarProps) {
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        borderRadius: 1.5,
        bgcolor: networkBg,
        color: networkColor,
        fontSize: size <= 32 ? 11 : 12,
        fontWeight: 600,
      }}
    >
      {network}
    </Avatar>
  );
}
