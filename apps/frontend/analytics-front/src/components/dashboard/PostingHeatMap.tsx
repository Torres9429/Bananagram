'use client';

import { useDispatch, useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { EmptyState } from '@repo/ui/ui';
import { selectNetwork, selectPost } from '../../store/analyticsFilters.slice';
import { selectHeatMap } from '../../store/analytics.selectors';
import { HOUR_BUCKET_LABELS, WEEKDAY_LABELS } from '../../lib/analytics/engine';

/**
 * Día × hora con mayor interacción. Clic en una celda filtra el dashboard:
 * si la celda corresponde a una publicación concreta, hace drill a esa
 * publicación (selectPost); si no, filtra por la red de esa celda (selectNetwork).
 * Reutiliza selectPost/selectNetwork ya existentes — no se agrega estado nuevo.
 */
export function PostingHeatMap() {
  const dispatch = useDispatch();
  const cells = useSelector(selectHeatMap);

  if (cells.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin datos de horarios" description="Ajusta los filtros activos." />
      </Paper>
    );
  }

  const maxValue = Math.max(...cells.map((c) => c.value));
  const grid = new Map(cells.map((c) => [`${c.day}-${c.hourBucket}`, c]));

  function handleCellClick(day: number, hourBucket: number) {
    const cell = grid.get(`${day}-${hourBucket}`);
    if (!cell) return;
    if (cell.postId) {
      dispatch(selectPost(cell.postId));
    } else if (cell.networkCode) {
      dispatch(selectNetwork(cell.networkCode));
    }
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Horarios de mayor interacción</Typography>
      <Typography variant="caption" color="text.secondary" mb={2} display="block">
        Clic en una celda para filtrar por esa publicación o red.
      </Typography>

      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `70px repeat(${HOUR_BUCKET_LABELS.length}, 1fr)`, gap: 0.5, minWidth: 560 }}>
          <Box />
          {HOUR_BUCKET_LABELS.map((label) => (
            <Typography key={label} variant="caption" color="text.secondary" textAlign="center">{label}</Typography>
          ))}

          {WEEKDAY_LABELS.map((dayLabel, day) => (
            <Box key={dayLabel} sx={{ display: 'contents' }}>
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>{dayLabel.slice(0, 3)}</Typography>
              {HOUR_BUCKET_LABELS.map((_, hourBucket) => {
                const cell = grid.get(`${day}-${hourBucket}`);
                const intensity = cell ? cell.value / maxValue : 0;
                return (
                  <Tooltip
                    key={hourBucket}
                    title={cell ? `${cell.value.toLocaleString()} interacciones` : 'Sin actividad'}
                  >
                    <Box
                      onClick={() => handleCellClick(day, hourBucket)}
                      sx={{
                        height: 28,
                        borderRadius: 1,
                        cursor: cell ? 'pointer' : 'default',
                        bgcolor: cell ? `rgba(224, 168, 0, ${0.15 + intensity * 0.85})` : '#F5F5F5',
                        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                        '&:hover': cell ? { transform: 'scale(1.08)', boxShadow: '0 0 0 2px #7A5C00' } : undefined,
                      }}
                    />
                  </Tooltip>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
}
