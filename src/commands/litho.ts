import { parseColumns } from '../core/parser.js';
import { exportData } from './export.js';
import type { LithoOptions, LithoResult } from '../types/index.js';
import { LITHO_KEYWORDS } from '../constants/mining.js';

export async function runLitho(file: string, opts: LithoOptions = {}): Promise<LithoResult> {
  const { headers, columns } = await parseColumns(file, 0, undefined, opts.baseDir);
  const targetCols =
    opts.cols && opts.cols.length > 0
      ? opts.cols
      : headers.filter((h) => LITHO_KEYWORDS.some((k) => h.toUpperCase().includes(k)));

  const result: LithoResult = {};

  for (const col of targetCols) {
    const vals = columns[col] ?? [];
    const unique = [...new Set(vals.map((v) => v.trim()).filter(Boolean))].sort();
    result[col] = unique;
  }

  return result;
}

export function printLitho(result: LithoResult) {
  console.log('\n=== UNIQUE LITHO VALUES ===');
  for (const [col, vals] of Object.entries(result)) {
    console.log(`\n${col} (${vals.length} values):`);
    console.log(`  ${vals.join(', ')}`);
  }
}

export default async function lithoCmd(file: string, opts: LithoOptions) {
  const result = await runLitho(file, opts);
  printLitho(result);
  if (opts.output) {
    const f = exportData(result, 'litho_values', opts.output as 'csv' | 'txt');
    console.log(`\nExportado: ${f}`);
  }
  return result;
}
