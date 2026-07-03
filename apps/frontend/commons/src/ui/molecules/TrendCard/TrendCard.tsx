'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import { WidgetCard } from '../WidgetCard/WidgetCard';

export type Trend = 'up' | 'down' | 'flat';

interface TrendCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  unit?: string;
  deltaPercent: number;
  trend: Trend;
  /** Ej. "vs. semana anterior" */
  comparisonLabel?: string;
  iconBg?: string;
  iconColor?: string;
  formatter?: (value: number) => string;
}

const TREND_COLOR: Record<Trend, string> = { up: '#2E7D32', down: '#C62828', flat: '#8F8F8F' };
const TREND_ICON: Record<Trend, typeof ArrowUpwardIcon> = {
  up: ArrowUpwardIcon,
  down: ArrowDownwardIcon,
  flat: RemoveIcon,
};

export function TrendCard({
  icon,
  label,
  value,
  unit = '',
  deltaPercent,
  trend,
  comparisonLabel,
  iconBg,
  iconColor,
  formatter,
}: TrendCardProps) {
  const display = formatter ? formatter(value) : `${value.toLocaleString()}${unit}`;
  const TrendIcon = TREND_ICON[trend];
  const color = TREND_COLOR[trend];

  return (
    <WidgetCard
      icon={icon}
      label={label}
      value={display}
      iconBg={iconBg}
      iconColor={iconColor}
      addon={
        <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap">
          <Box sx={{ display: 'flex', alignItems: 'center', color }}>
            <TrendIcon sx={{ fontSize: 14 }} />
          </Box>
          <Typography variant="caption" sx={{ color, fontWeight: 700 }}>
            {Math.abs(deltaPercent).toFixed(1)}%
          </Typography>
          {comparisonLabel && (
            <Typography variant="caption" color="text.secondary">
              {comparisonLabel}
            </Typography>
          )}
        </Stack>
      }
    />
  );
}
