import { parseColumns } from '../core/parser.js';
import { exportData } from './export.js';
import type { LithoOptions, LithoResult, LithoDetail } from '../types/index.js';
import { LITHO_KEYWORDS } from '../constants/mining.js';

export async function runLitho(file: string, opts: LithoOptions = {}): Promise<LithoResult> {
  const { headers, columns } = await parseColumns(file, 0, undefined, opts.baseDir);
  let targetCols =
    opts.cols && opts.cols.length > 0
      ? opts.cols
      : headers.filter((h) => LITHO_KEYWORDS.some((k) => h.toUpperCase().includes(k)));

  if (!targetCols.length) {
    const nonInterval = ['HOLE_ID', 'HOLEID', 'BHID', 'FROM', 'TO', 'LENGTH', 'X', 'Y', 'Z', 'DEPTH'];
    targetCols = headers.filter((h) => !nonInterval.includes(h.toUpperCase()));
  }

  const result: LithoResult = {};
  const details: Record<string, LithoDetail[]> = {};

  for (const col of targetCols) {
    const rawVals = (columns[col] ?? []).map((v) => v.trim()).filter(Boolean);
    const totalCount = rawVals.length;

    // Frecuencia por código
    const freqMap = new Map<string, number>();
    for (const val of rawVals) {
      freqMap.set(val, (freqMap.get(val) ?? 0) + 1);
    }

    const unique = Array.from(freqMap.keys()).sort();
    result[col] = unique;

    const colDetails: LithoDetail[] = unique.map((code) => {
      const count = freqMap.get(code) ?? 0;
      const percentage = totalCount > 0 ? +((count / totalCount) * 100).toFixed(2) : 0;
      return { code, count, percentage };
    });

    // Ordenar detalles por conteo descendente
    colDetails.sort((a, b) => b.count - a.count);
    details[col] = colDetails;
  }

  result._details = details;
  return result;
}

export function printLitho(result: LithoResult) {
  console.log('\n=== LITHOLOGY & ROCK CODE ANALYSIS ===');
  const details = result._details ?? {};

  for (const [col, vals] of Object.entries(result)) {
    if (col === '_details' || !Array.isArray(vals)) continue;
    const colDetails = details[col] ?? [];

    console.log(`\nColumna: ${col} (${vals.length} códigos únicos):`);
    if (colDetails.length > 0) {
      console.log(`  ${'Código'.padEnd(16)} ${'Frecuencia (Tramos)'.padStart(20)} ${'% del Total'.padStart(14)}`);
      console.log(`  ${'─'.repeat(52)}`);
      for (const d of colDetails) {
        console.log(
          `  ${d.code.padEnd(16)} ${String(d.count).padStart(20)} ${String(d.percentage + '%').padStart(14)}`,
        );
      }
    } else {
      console.log(`  Códigos: ${(vals as string[]).join(', ')}`);
    }
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
