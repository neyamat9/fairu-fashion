// CSV helpers shared by exports and imports.

// Quotes one cell, and neutralises spreadsheet formulas (=, +, -, @) so a
// customer-controlled value cannot run code when the file is opened in Excel.
export function csvCell(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ''
      : value instanceof Date
        ? value.toISOString()
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value as string | number | boolean | bigint);
  // real numbers (e.g. -5) are safe and must stay numbers
  const safe =
    typeof value !== 'number' && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvLine(values: unknown[]): string {
  return values.map(csvCell).join(',');
}

export interface CsvParseResult {
  header: string[];
  rows: Record<string, string>[];
}

// RFC 4180 parser: quoted fields, "" escapes, CRLF/LF, optional BOM.
export function parseCsv(input: string): CsvParseResult {
  const text = input.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((v) => v.trim() !== '')) records.push(row);
      row = [];
    } else {
      cell += c;
    }
  }
  if (quoted) throw new Error('Unclosed quote in CSV');
  row.push(cell);
  if (row.some((v) => v.trim() !== '')) records.push(row);

  const [head, ...body] = records;
  if (!head) return { header: [], rows: [] };
  const header = head.map((h) => h.trim().toLowerCase());
  const rows = body.map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, idx) => {
      o[h] = (r[idx] ?? '').trim();
    });
    return o;
  });
  return { header, rows };
}
