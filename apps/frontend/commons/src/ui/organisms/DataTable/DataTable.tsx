'use client';

import type { ReactNode } from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

export interface DataTableColumn<T> {
  key: string;
  header?: ReactNode;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, rows, getRowKey, onRowClick }: DataTableProps<T>) {
  return (
    <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, overflow: 'hidden' }}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                align={col.align}
                sx={{
                  width: col.width,
                  bgcolor: '#FFF8E1',
                  color: '#7A5C00',
                  fontWeight: 700,
                  borderBottom: '1px solid #E8E8E8',
                }}
              >
                {col.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow
              key={getRowKey(row)}
              hover
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                bgcolor: i % 2 === 0 ? '#FFFFFF' : '#F7F7F7',
                '&:hover': { bgcolor: '#FFF3D6' },
                '& td': { borderBottom: '1px solid #E8E8E8' },
                '&:last-child td': { borderBottom: 0 },
              }}
            >
              {columns.map((col) => (
                <TableCell key={col.key} align={col.align} sx={{ width: col.width }}>
                  {col.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
