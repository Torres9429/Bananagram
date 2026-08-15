'use client';

import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export interface MediaCarouselItem {
  url: string;
  type: 'image' | 'video';
  alt?: string;
}

interface MediaCarouselProps {
  items: MediaCarouselItem[];
  emptyLabel?: string;
}

// Carrusel estilo Instagram (cuadrado, deslizable, flechas + puntos cuando
// hay más de un archivo) — sin librería externa: scroll-snap nativo de CSS
// más el índice sincronizado a mano por scroll, mismo criterio "MUI puro,
// sin dependencias nuevas" que el resto del proyecto.
export function MediaCarousel({ items, emptyLabel = 'Sin imagen adjunta' }: MediaCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function scrollToIndex(next: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
    setIndex(next);
  }

  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  }

  if (items.length === 0) {
    return (
      <Box sx={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 1.5, bgcolor: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" sx={{ color: '#9E9E9E' }}>{emptyLabel}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Box
        ref={trackRef}
        onScroll={handleScroll}
        sx={{
          display: 'flex',
          width: '100%',
          aspectRatio: '1 / 1',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          borderRadius: 1.5,
          bgcolor: '#E0E0E0',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {items.map((item, i) => (
          <Box key={i} sx={{ flex: '0 0 100%', scrollSnapAlign: 'start', width: '100%', height: '100%' }}>
            {item.type === 'video' ? (
              <Box
                component="video"
                controls
                playsInline
                preload="metadata"
                src={item.url}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <Box component="a" href={item.url} target="_blank" rel="noreferrer" sx={{ display: 'block', width: '100%', height: '100%' }}>
                <Box component="img" src={item.url} alt={item.alt ?? ''} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {items.length > 1 && index > 0 && (
        <IconButton
          size="small"
          onClick={() => scrollToIndex(index - 1)}
          sx={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.45)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' } }}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
      )}
      {items.length > 1 && index < items.length - 1 && (
        <IconButton
          size="small"
          onClick={() => scrollToIndex(index + 1)}
          sx={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.45)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' } }}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      )}

      {items.length > 1 && (
        <Box sx={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 0.5 }}>
          {items.map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: i === index ? '#fff' : 'rgba(255,255,255,0.5)',
                boxShadow: '0 0 2px rgba(0,0,0,0.5)',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
