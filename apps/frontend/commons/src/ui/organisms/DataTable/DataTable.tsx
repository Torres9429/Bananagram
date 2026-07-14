'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TablePagination from '@mui/material/TablePagination';
import Typography from '@mui/material/Typography';

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
  // Paginación (§3 revisión de tablas) — opcional y apagada por defecto para
  // no romper ninguna pantalla existente que no la pida explícitamente.
  pagination?: boolean;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  // Estado vacío (opcional, retrocompatible) — mensaje mostrado dentro de la
  // tabla cuando rows.length === 0. No reutiliza el molecule EmptyState: ese
  // está pensado para vaciar una pantalla completa (título h6 + py:8), demasiado
  // grande para una fila de tabla — este es un estado compacto propio de DataTable.
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  pagination = false,
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  emptyMessage = 'No hay registros para mostrar.',
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialPageSize);

  // Clamp en vez de efecto: si `rows` cambia (filtro, refetch) y la página
  // actual queda fuera de rango, se recalcula sola sin depender de un
  // useEffect ni de resetear el estado manualmente en cada pantalla.
  const pageCount = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);

  const visibleRows = useMemo(() => {
    if (!pagination) return rows;
    const start = safePage * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, pagination, safePage, rowsPerPage]);

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                align={col.align}
                sx={{
                  width: col.width,
                  bgcolor: 'primary.main',
                  color: 'secondary.contrastText',
                  fontWeight: 700,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {col.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 5, borderBottom: 0 }}>
                <Typography variant="body2" color="text.secondary">{emptyMessage}</Typography>
              </TableCell>
            </TableRow>
          ) : (
            visibleRows.map((row, i) => (
              <TableRow
                key={getRowKey(row)}
                hover
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  bgcolor: i % 2 === 0 ? 'background.paper' : 'background.default',
                  '&:hover': { bgcolor: 'primary.light' },
                  '& td': { borderBottom: '1px solid', borderColor: 'divider' },
                  '&:last-child td': { borderBottom: 0 },
                }}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} align={col.align} sx={{ width: col.width }}>
                    {col.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {pagination && rows.length > 0 && (
        <TablePagination
          component="div"
          count={rows.length}
          page={safePage}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={pageSizeOptions}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      )}
    </Paper>
  );
}
