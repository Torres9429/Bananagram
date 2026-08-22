'use client';

import type { ReactNode } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export type InsightSeverity = 'info' | 'success' | 'warning' | 'error';

interface InsightCardProps {
  severity: InsightSeverity;
  title: string;
  description?: string;
  action?: ReactNode;
}

const SEVERITY_ICON: Record<InsightSeverity, typeof InfoOutlinedIcon> = {
  info: InfoOutlinedIcon,
  success: CheckCircleOutlineIcon,
  warning: WarningAmberOutlinedIcon,
  error: ErrorOutlineIcon,
};

export function InsightCard({ severity, title, description, action }: InsightCardProps) {
  const Icon = SEVERITY_ICON[severity];
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: `${severity}.light`,
        borderRadius: 3,
        bgcolor: `${severity}.light`,
      }}
    >
      <Stack direction="row" gap={1.5} alignItems="flex-start">
        <Box sx={{ color: `${severity}.main`, display: 'flex', pt: 0.25 }}>
          <Icon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700}>
            {title}
          </Typography>
          {description && (
            <Typography variant="caption" color="text.secondary">
              {description}
            </Typography>
          )}
          {action && <Box sx={{ mt: 1 }}>{action}</Box>}
        </Box>
      </Stack>
    </Paper>
  );
}
