import { parseColumns } from '../core/parser.js';
import { exportData } from './export.js';

const SKIP = ['HOLE_ID', 'FROM', 'TO', 'SAMPLE_#', 'SAMPLE'];

function percentile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo  = Math.floor(idx);
  const hi  = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return +(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)).toFixed(6);
}

function calcRanges(vals, n) {
  const sorted = [...vals].sort((a, b) => a - b);
  const step   = 100 / n;
  const breaks = [];
  for (let i = 0; i <= n; i++) {
    breaks.push(percentile(sorted, i * step));
  }
  return Array.from({ length: n }, (_, i) => ({
    clase:          i + 1,
    from:           breaks[i],
    to:             breaks[i + 1],
    percentil_from: +((i * step).toFixed(4)),
    percentil_to:   +(((i + 1) * step).toFixed(4)),
  }));
}

export function runAssay(file, opts = {}) {
  const { headers, columns } = parseColumns(file);
  const nClases = parseInt(opts.classes   ?? 6);
  const numCols = opts.cols && opts.cols.length > 0 
    ? opts.cols 
    : headers.filter(h => !SKIP.includes(h));
  const result  = {};

  for (const col of numCols) {
    const vals = columns[col]
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v));

    if (!vals.length) continue;

    const raw_min = Math.min(...vals);
    const raw_max = Math.max(...vals);

    result[col] = {
      raw_min,
      raw_max,
      count:        vals.length,
      ranges:       calcRanges(vals, nClases),
    };
  }

  return result;
}

export function printAssay(result) {
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
        `  ${String(r.clase).padEnd(8)} ${String(r.from).padStart(10)} ${String(r.to).padStart(10)}   ${r.percentil_from}% → ${r.percentil_to}%`
      );
    }
  }
}

export default function assayCmd(file, opts) {
  const result = runAssay(file, opts);
  printAssay(result);
  if (opts.output) {
    const f = exportData(result, 'assay_limits', opts.output);
    const files = Array.isArray(f) ? f : [f];
    console.log(`\nExportado:`);
    files.forEach(file => console.log(`  - ${file}`));
  }
  return result;
}