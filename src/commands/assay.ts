import { parseColumns } from '../core/parser.js';
import { exportData } from './export.js';
import type { AssayOptions, AssayResult, Range } from '../types/index.js';
import { percentile, getMin, getMax } from '../utils/math.js';
import { ASSAY_SKIP_COLUMNS } from '../constants/mining.js';

const SKIP = ASSAY_SKIP_COLUMNS;

function calcRanges(vals: number[], n: number): Range[] {
  const sorted = [...vals].sort((a, b) => a - b);
  const step = 100 / n;
  const breaks: number[] = [];
  for (let i = 0; i <= n; i++) {
    breaks.push(percentile(sorted, i * step));
  }
  return Array.from({ length: n }, (_, i) => ({
    clase: i + 1,
    from: breaks[i] ?? 0,
    to: breaks[i + 1] ?? 0,
    percentil_from: +(i * step).toFixed(4),
    percentil_to: +((i + 1) * step).toFixed(4),
  }));
}

export async function runAssay(file: string, opts: AssayOptions = {}): Promise<AssayResult> {
  const targetCols = opts.cols && opts.cols.length > 0 ? opts.cols : undefined;
  const { headers, columns } = await parseColumns(file, 0, targetCols, opts.baseDir);
  const nClases = typeof opts.classes === 'string' ? parseInt(opts.classes) : (opts.classes ?? 6);
  const numCols = targetCols || headers.filter((h) => !SKIP.includes(h));
  const result: AssayResult = {};

  for (const col of numCols) {
    const vals = (columns[col] ?? []).map((v) => parseFloat(v)).filter((v) => !isNaN(v));

    if (!vals.length) continue;

    const raw_min = getMin(vals);
    const raw_max = getMax(vals);

    result[col] = {
      raw_min,
      raw_max,
      count: vals.length,
      ranges: calcRanges(vals, nClases),
    };
  }

  return result;
}

export function printAssay(result: AssayResult): void {
  console.log('\n=== ASSAY LIMITS ===');
  for (const [col, v] of Object.entries(result)) {
    console.log(`\n${col}:`);
    console.log(`  raw         : [${v.raw_min}, ${v.raw_max}]`);
    console.log(`  count       : ${v.count}`);
    console.log(`  ranges (${v.ranges.length} clases):`);
    console.log(`  ${'Clase'.padEnd(8)} ${'From'.padStart(10)} ${'To'.padStart(10)}   Percentil`);
    console.log(`  ${'─'.repeat(48)}`);
    for (const r of v.ranges) {
      console.log(
        `  ${String(r.clase).padEnd(8)} ${String(r.from).padStart(10)} ${String(r.to).padStart(10)}   ${r.percentil_from}% → ${r.percentil_to}%`,
      );
    }
  }
}

export default async function assayCmd(file: string, opts: AssayOptions) {
  const result = await runAssay(file, opts);
  printAssay(result);
  if (opts.output) {
    const f = exportData(result, 'assay_limits', opts.output as any);
    const files = Array.isArray(f) ? f : [f];
    console.log(`\nExportado:`);
    files.forEach((file) => console.log(`  - ${file}`));
  }
  return result;
}
