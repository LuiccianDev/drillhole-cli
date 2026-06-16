import fs from 'fs';
import path from 'path';

export function parseFile(filepath) {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Archivo no encontrado: ${filepath}`);
  }

  const raw = fs.readFileSync(filepath, 'utf8');
  const lines = raw.replace(/\r/g, '').split('\n').filter(Boolean);

  if (lines.length < 2) {
    throw new Error(`Archivo sin datos suficientes: ${filepath}`);
  }

  const firstLine = lines[0];
  const delim = firstLine.includes('\t') ? '\t' : ',';
  const headers = firstLine.split(delim).map(h => h.trim());

  const rows = lines.slice(1).map(line => {
    const vals = line.split(delim);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i]?.trim() ?? '']));
  });

  return { headers, rows, delim };
}

export function parseColumns(filepath, maxRows = 0) {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Archivo no encontrado: ${filepath}`);
  }

  const raw = fs.readFileSync(filepath, 'utf8');
  const lines = raw.replace(/\r/g, '').split('\n').filter(Boolean);

  if (lines.length < 2) {
    throw new Error(`Archivo sin datos suficientes: ${filepath}`);
  }

  const firstLine = lines[0];
  const delim = firstLine.includes('\t') ? '\t' : ',';
  const headers = firstLine.split(delim).map(h => h.trim());

  const limit = maxRows > 0 ? Math.min(lines.length, maxRows + 1) : lines.length;
  const dataLines = lines.slice(1, limit);

  const columns = {};
  for (const h of headers) {
    columns[h] = [];
  }

  for (const line of dataLines) {
    const vals = line.split(delim);
    for (let i = 0; i < headers.length; i++) {
      columns[headers[i]].push(vals[i]?.trim() ?? '');
    }
  }

  return { headers, columns, delim };
}

export function getFilesInDir(dir = process.cwd()) {
  const allowed = ['.txt', '.csv'];
  return fs.readdirSync(dir)
    .filter(f => allowed.includes(path.extname(f).toLowerCase()))
    .sort();
}