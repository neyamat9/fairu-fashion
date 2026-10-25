import { BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import ExcelJS from 'exceljs';
import { csvLine } from '../utils/csv';

export const EXPORT_FORMATS = ['json', 'csv', 'xlsx'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export type ColumnType =
  | 'text'
  | 'int'
  | 'number'
  | 'money'
  | 'percent'
  | 'date';

export interface Column {
  key: string;
  header: string;
  type?: ColumnType;
}

export type Row = Record<string, unknown>;

export interface Table {
  title: string;
  filename: string; // without extension
  columns: Column[];
  rows: Row[];
  // A final summary line (sums), shown in bold in Excel
  totals?: Row;
  // Shown above the table in Excel and returned in JSON, e.g. the date range
  meta?: Record<string, unknown>;
}

const MIME: Record<Exclude<ExportFormat, 'json'>, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// Any cell value as plain text
const text = (v: unknown): string =>
  typeof v === 'string'
    ? v
    : typeof v === 'object' && v !== null
      ? JSON.stringify(v)
      : String(v as number | boolean | bigint);

const asDate = (v: unknown): Date | null => {
  if (v instanceof Date) return v;
  if (typeof v === 'string' && v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

function plain(c: Column, v: unknown): unknown {
  if (v === null || v === undefined) return '';
  // a label such as "Total" in a date column stays as it is
  if (c.type === 'date') return asDate(v)?.toISOString() ?? text(v);
  return v;
}

function safeName(name: string) {
  return name.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80);
}

// Sends a table as JSON, CSV or Excel. CSV starts with a BOM so Excel reads
// Bangla text correctly; cells that start with = + - @ are neutralised, and
// Excel cells are written as plain values (never as formulas).
export async function sendTable(
  res: Response,
  format: ExportFormat,
  table: Table,
) {
  const rowsWithTotals = table.totals
    ? [...table.rows, table.totals]
    : table.rows;

  if (format === 'json') {
    res.json({
      success: true,
      data: {
        title: table.title,
        meta: table.meta ?? null,
        columns: table.columns,
        rows: table.rows,
        totals: table.totals ?? null,
      },
    });
    return;
  }

  const base = `${safeName(table.filename)}-${new Date().toISOString().slice(0, 10)}`;
  res.setHeader('Content-Type', MIME[format]);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${base}.${format}"`,
  );

  if (format === 'csv') {
    res.write(String.fromCharCode(0xfeff));
    res.write(csvLine(table.columns.map((c) => c.header)) + '\r\n');
    for (const row of rowsWithTotals) {
      res.write(
        csvLine(table.columns.map((c) => plain(c, row[c.key]))) + '\r\n',
      );
    }
    res.end();
    return;
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Shop admin';
  wb.created = new Date();
  const ws = wb.addWorksheet(
    table.title.slice(0, 31).replace(/[\\/?*[\]:]/g, ' '),
  );

  let headerRow = 1;
  if (table.meta) {
    for (const [k, v] of Object.entries(table.meta)) {
      ws
        .addRow([k, v === null || v === undefined ? '' : text(v)])
        .getCell(1).font = { bold: true };
    }
    ws.addRow([]);
    headerRow = ws.rowCount + 1;
  }
  const head = ws.addRow(table.columns.map((c) => c.header));
  head.font = { bold: true };
  head.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEFEFEF' },
  };

  const widths = table.columns.map((c) => c.header.length);
  const addData = (row: Row, bold = false) => {
    const cells = table.columns.map((c) => {
      const v = row[c.key];
      if (v === null || v === undefined || v === '') return null;
      if (c.type === 'date') return asDate(v) ?? text(v);
      if (
        c.type === 'int' ||
        c.type === 'number' ||
        c.type === 'money' ||
        c.type === 'percent'
      ) {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      }
      // plain text, even if it looks like a formula
      return typeof v === 'object'
        ? JSON.stringify(v)
        : String(v as string | number | boolean);
    });
    const r = ws.addRow(cells);
    if (bold) r.font = { bold: true };
    cells.forEach((v, i) => {
      const len = v instanceof Date ? 16 : String(v ?? '').length;
      widths[i] = Math.max(widths[i], len);
    });
  };
  for (const row of table.rows) addData(row);
  if (table.totals) addData(table.totals, true);

  table.columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = Math.min(50, Math.max(10, widths[i] + 2));
    if (c.type === 'money' || c.type === 'number') col.numFmt = '#,##0.00';
    else if (c.type === 'int') col.numFmt = '#,##0';
    else if (c.type === 'percent') col.numFmt = '0.00"%"';
    else if (c.type === 'date') col.numFmt = 'yyyy-mm-dd hh:mm';
  });
  ws.views = [{ state: 'frozen', ySplit: headerRow }];

  await wb.xlsx.write(res);
  res.end();
}

export function parseFormat(value: string | undefined): ExportFormat {
  const f = (value ?? 'json').toLowerCase();
  if (!(EXPORT_FORMATS as readonly string[]).includes(f)) {
    throw new BadRequestException(
      `format must be one of: ${EXPORT_FORMATS.join(', ')}`,
    );
  }
  return f as ExportFormat;
}
