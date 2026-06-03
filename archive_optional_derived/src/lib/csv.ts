export type Row = Record<string, string>;

export function parseCSV(input: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell.trim());
      cell = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
  }

  const [header = [], ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, idx) => [h.trim(), r[idx] ?? ''])));
}

export function isActive(value: string | undefined): boolean {
  return value === undefined || value === '' || value === '1' || value?.toLowerCase() === 'true';
}

export function splitList(value = ''): string[] {
  return value.split(/[|,;]/).map((v) => v.trim()).filter(Boolean);
}
