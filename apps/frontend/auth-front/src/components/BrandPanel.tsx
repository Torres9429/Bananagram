import Box from '@mui/material/Box';
import Image from 'next/image';

const SHAPE_DARK = 'rgb(212 172 64 / 70%)';
const SHAPE_LIGHT = 'rgb(253 199 38 / 70%)';

// Óvalos
const SHAPE_WIDTH = 295;
const SHAPE_HEIGHT = 305;

const shapes = [
  { top: -90, left: -80, color: SHAPE_DARK },
  { top: -90, left: 190, color: SHAPE_LIGHT },
  { bottom: -90, left: -80, color: SHAPE_LIGHT },
  { bottom: -90, left: 190, color: SHAPE_DARK },
];

export function BrandPanel() {
  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        bgcolor: '#fff',
      }}
    >
      {shapes.map((shape, index) => (
        <Box
          key={index}
          sx={{
            position: 'absolute',
            width: SHAPE_WIDTH,
            height: SHAPE_HEIGHT,
            borderRadius: '50%',
            bgcolor: shape.color,
            ...shape,
          }}
        />
      ))}

      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          px: 5,
        }}
      >
        <Image
          src="/LogoName.png"
          alt="Bananagram"
          width={1408}
          height={768}
          priority
          style={{
            width: '100%',
            maxWidth: 260,
            height: 'auto',
          }}
        />
      </Box>
    </Box>
  );
}
