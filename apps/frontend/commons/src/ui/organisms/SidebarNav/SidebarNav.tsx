'use client';

import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const ACTIVE_BG = '#FDC726';
const INACTIVE_COLOR = '#D4AC40';
const WIDTH_EXPANDED = 220;
const WIDTH_COLLAPSED = 76;

export interface SidebarNavItem {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
}

interface SidebarNavProps {
  items: SidebarNavItem[];
  activeHref: string;
  onNavigate: (href: string) => void;
  header?: ReactNode;
  collapsedHeader?: ReactNode;
}

export function SidebarNav({ items, activeHref, onNavigate, header, collapsedHeader }: SidebarNavProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box
      sx={{
        width: collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        bgcolor: '#fff',
        borderRight: '1px solid #F0F0F0',
        display: 'flex',
        flexDirection: 'column',
        py: 2,
        transition: 'width 0.2s ease',
      }}
    >
      <IconButton
        size="small"
        onClick={() => setCollapsed((c) => !c)}
        sx={{
          position: 'absolute',
          top: 24,
          right: -14,
          zIndex: 2,
          width: 28,
          height: 28,
          bgcolor: '#fff',
          border: '1px solid #F0F0F0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          color: INACTIVE_COLOR,
          '&:hover': { bgcolor: '#fff' },
        }}
      >
        {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
      </IconButton>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 44,
          px: collapsed ? 0 : 2,
          mb: 1,
          overflow: 'hidden',
        }}
      >
        {collapsed ? collapsedHeader : header}
      </Box>

      <List sx={{ px: collapsed ? 1 : 1.5, pt: 0 }}>
        {items.map((item) => {
          const active = activeHref === item.href || activeHref.startsWith(`${item.href}/`);
          const button = (
            <ListItemButton
              key={item.key}
              selected={active}
              onClick={() => onNavigate(item.href)}
              sx={{
                borderRadius: 2,
                mb: 0.75,
                justifyContent: collapsed ? 'center' : 'flex-start',
                minHeight: 45,
                display: 'flex',
                alignItems: 'center',
                px: collapsed ? 1 : 2,
                color: active ? '#fff' : INACTIVE_COLOR,
                bgcolor: active ? ACTIVE_BG : 'transparent',
                '&:hover': { bgcolor: active ? ACTIVE_BG : 'rgba(253, 199, 38, 0.12)' },
                '&.Mui-selected': { bgcolor: ACTIVE_BG, '&:hover': { bgcolor: ACTIVE_BG } },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: collapsed ? 0 : 36, justifyContent: 'center' }}>
                {item.icon}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 700 : 600, fontSize: 14 }} />
              )}
            </ListItemButton>
          );

          return collapsed ? (
            <Tooltip key={item.key} title={item.label} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}
      </List>
    </Box>
  );
}
