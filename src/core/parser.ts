import fs from 'fs';
import path from 'path';
import readline from 'readline';
import type { Delimiter, ParseResult, ColumnResult } from '../types/index.js';
import { MINING_SENTINELS } from '../constants/mining.js';

/**
 * Splits a delimited line respecting quoted fields (e.g., "value, with, comma").
 * Also removes surrounding quotes from values.
 */
export function parseDelimitedLine(line: string, delim: Delimiter): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delim && !inQuotes) {
      result.push(cleanFieldValue(current));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(cleanFieldValue(current));
  return result;
}

function cleanFieldValue(val: string): string {
  const trimmed = val.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Checks if a value matches standard mining missing/sentinel representations.
 */
export function isMiningSentinel(val: string | number | undefined | null): boolean {
  if (val === undefined || val === null) return true;
  const str = String(val).trim().toUpperCase();
  if (!str) return true;
  return (MINING_SENTINELS as readonly string[]).includes(str);
}

/**
 * Detects delimiter and gets headers from the first line of a file.
 */
async function getFileMeta(filepath: string): Promise<{ headers: string[]; delim: Delimiter }> {
  const stream = fs.createReadStream(filepath);
  const rl = readline.createInterface({ input: stream });

  let firstLine = '';
  for await (const line of rl) {
    firstLine = line;
    break;
  }
  rl.close();
  stream.destroy();

  if (!firstLine) {
    throw new Error(`Archivo vacío o sin datos: ${filepath}`);
  }

  // Strip UTF-8 BOM if present
  if (firstLine.charCodeAt(0) === 0xfeff) {
    firstLine = firstLine.slice(1);
  }

  const delim: Delimiter = firstLine.includes('\t') ? '\t' : ',';
  const headers = parseDelimitedLine(firstLine, delim);

  return { headers, delim };
}

/**
 * Validates and resolves the filepath to prevent path traversal
 * and ensure it is a .csv or .txt file.
 * @param baseDir Directorio raíz permitido. Si no se provee, usa process.cwd().
 */
export function validateSafePath(filepath: string, baseDir?: string): string {
  const root = path.resolve(baseDir ?? process.cwd());
  const resolved = path.resolve(filepath);
  const ext = path.extname(resolved).toLowerCase();
  if (ext !== '.csv' && ext !== '.txt') {
    throw new Error('Solo se permiten archivos con extensión .csv o .txt');
  }

  // Prevenir path traversal fuera del directorio base
  if (!resolved.startsWith(root)) {
    throw new Error(`Acceso denegado: El archivo debe estar dentro del directorio base (${root}).`);
  }

  return resolved;
}

/**
 * Parses file into an array of objects (rows).
 * Optimized with streams and proper cleanup to avoid leaks.
 */
export async function parseFile<T extends Record<string, string> = Record<string, string>>(
  filepath: string,
  baseDir?: string,
): Promise<ParseResult<T>> {
  const safePath = validateSafePath(filepath, baseDir);
  if (!fs.existsSync(safePath)) {
    throw new Error(`Archivo no encontrado: ${filepath}`);
  }

  const { headers, delim } = await getFileMeta(safePath);
  const rows: T[] = [];

  const stream = fs.createReadStream(safePath);
  const rl = readline.createInterface({ input: stream });

  try {
    let isHeader = true;
    for await (const line of rl) {
      if (isHeader) {
        isHeader = false;
        continue;
      }
      if (!line.trim()) continue;

      const vals = parseDelimitedLine(line, delim);
      const row = {} as T;
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        if (h) (row as Record<string, string>)[h] = vals[i]?.trim() ?? '';
      }
      rows.push(row);
    }
  } finally {
    rl.close();
    stream.destroy();
  }

  return { headers: headers as (keyof T & string)[], rows, delim };
}

/**
 * Parses file into columns (arrays of values).
 * More efficient for statistical analysis of specific columns.
 * Supports targetColumns to perform lazy/selective column parsing.
 */
export async function parseColumns<T extends Record<string, string> = Record<string, string>>(
  filepath: string,
  maxRows = 0,
  targetColumns?: (keyof T & string)[],
  baseDir?: string,
): Promise<ColumnResult<T>> {
  const safePath = validateSafePath(filepath, baseDir);
  if (!fs.existsSync(safePath)) {
    throw new Error(`Archivo no encontrado: ${filepath}`);
  }

  const { headers, delim } = await getFileMeta(safePath);

  // Si targetColumns está definido, solo guardamos en memoria esas columnas
  const selectedHeaders =
    targetColumns && targetColumns.length > 0
      ? headers.filter((h) => targetColumns.includes(h as keyof T & string))
      : headers;

  const columns = {} as Record<keyof T & string, string[]>;
  for (const h of selectedHeaders) {
    columns[h as keyof T & string] = [];
  }

  const stream = fs.createReadStream(safePath);
  const rl = readline.createInterface({ input: stream });

  try {
    let isHeader = true;
    let count = 0;
    for await (const line of rl) {
      if (isHeader) {
        isHeader = false;
        continue;
      }
      if (!line.trim()) continue;

      const vals = parseDelimitedLine(line, delim);
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        if (h && columns[h as keyof T & string] !== undefined) {
          columns[h as keyof T & string].push(vals[i]?.trim() ?? '');
        }
      }

      count++;
      if (maxRows > 0 && count >= maxRows) break;
    }
  } finally {
    rl.close();
    stream.destroy();
  }

  return { headers: headers as (keyof T & string)[], columns, delim };
}

export function getFilesInDir(dir?: string): string[] {
  const allowed = ['.txt', '.csv'];
  const resolvedDir = path.resolve(dir ?? process.cwd());
  const base = path.resolve(process.cwd());

  // Prevenir path traversal fuera del directorio de trabajo
  if (!resolvedDir.startsWith(base)) {
    throw new Error(`Acceso denegado: El directorio debe estar dentro de ${base}.`);
  }

  return fs
    .readdirSync(resolvedDir)
    .filter((f: string) => allowed.includes(path.extname(f).toLowerCase()))
    .sort();
}
