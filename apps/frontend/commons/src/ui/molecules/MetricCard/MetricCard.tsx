'use client';

import type { ReactNode } from 'react';
import { WidgetCard } from '../WidgetCard/WidgetCard';

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  /** `null` = dato no disponible (nunca se confunde con 0 real) — se muestra "—". */
  value: number | null;
  /** Sufijo de unidad, ej. '%', 'K', 'seg' */
  unit?: string;
  iconBg?: string;
  iconColor?: string;
  /** Formateador custom; si no se da, usa toLocaleString() + unit */
  formatter?: (value: number) => string;
}

export function MetricCard({ icon, label, value, unit = '', iconBg, iconColor, formatter }: MetricCardProps) {
  const display = value === null ? '—' : formatter ? formatter(value) : `${value.toLocaleString()}${unit}`;
  return <WidgetCard icon={icon} label={label} value={display} iconBg={iconBg} iconColor={iconColor} />;
}
