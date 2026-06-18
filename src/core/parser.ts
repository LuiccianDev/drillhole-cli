import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { Delimiter, ParseResult, ColumnResult } from '../types/index.js';

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

  const delim: Delimiter = firstLine.includes('\t') ? '\t' : ',';
  const headers = firstLine.split(delim).map(h => h.trim());
  
  return { headers, delim };
}

/**
 * Parses file into an array of objects (rows).
 * Optimized with streams to avoid loading the entire file as a single string.
 */
export async function parseFile<T extends Record<string, string> = Record<string, string>>(
  filepath: string
): Promise<ParseResult<T>> {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Archivo no encontrado: ${filepath}`);
  }

  const { headers, delim } = await getFileMeta(filepath);
  const rows: T[] = [];

  const stream = fs.createReadStream(filepath);
  const rl = readline.createInterface({ input: stream });

  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (!line.trim()) continue;

    const vals = line.split(delim);
    const row = {} as T;
    for (let i = 0; i < headers.length; i++) {
      (row as any)[headers[i]] = vals[i]?.trim() ?? '';
    }
    rows.push(row);
  }

  return { headers: headers as (keyof T & string)[], rows, delim };
}

/**
 * Parses file into columns (arrays of values).
 * More efficient for statistical analysis of specific columns.
 */
export async function parseColumns<T extends Record<string, string> = Record<string, string>>(
  filepath: string, 
  maxRows = 0
): Promise<ColumnResult<T>> {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Archivo no encontrado: ${filepath}`);
  }

  const { headers, delim } = await getFileMeta(filepath);
  const columns = {} as Record<keyof T & string, string[]>;
  for (const h of headers) {
    columns[h as keyof T & string] = [];
  }

  const stream = fs.createReadStream(filepath);
  const rl = readline.createInterface({ input: stream });

  let isHeader = true;
  let count = 0;
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (!line.trim()) continue;

    const vals = line.split(delim);
    for (let i = 0; i < headers.length; i++) {
      columns[headers[i] as keyof T & string].push(vals[i]?.trim() ?? '');
    }

    count++;
    if (maxRows > 0 && count >= maxRows) break;
  }
  
  rl.close();
  stream.destroy();

  return { headers: headers as (keyof T & string)[], columns, delim };
}

export function getFilesInDir(dir = process.cwd()): string[] {
  const allowed = ['.txt', '.csv'];
  return fs.readdirSync(dir)
    .filter((f: string) => allowed.includes(path.extname(f).toLowerCase()))
    .sort();
}
