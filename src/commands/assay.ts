import { parseColumns, isMiningSentinel } from '../core/parser.js';
import { exportData } from './export.js';
import type { AssayOptions, AssayResult, Range } from '../types/index.js';
import {
  percentile,
  getMin,
  getMax,
  getMean,
  getMedian,
  getStdDev,
  getVariance,
  getCoefficientOfVariation,
} from '../utils/math.js';
import { ASSAY_SKIP_COLUMNS } from '../constants/mining.js';

const SKIP = ASSAY_SKIP_COLUMNS;

function calcRanges(vals: number[], n: number): Range[] {
  const sorted = [...vals].sort((a, b) => a - b);
  const step = 100 / n;
  const breaks: number[] = [];
  for (let i = 0; i <= n; i++) {
    breaks.push(percentile(sorted, i * step));
  }

  const total = sorted.length;
  return Array.from({ length: n }, (_, i) => {
    const from = breaks[i] ?? 0;
    const to = breaks[i + 1] ?? 0;

    // Conteo de muestras que caen en este rango
    const samplesInBin = sorted.filter((v) => {
      if (i === 0) {
        return v >= from && v <= to;
      }
      return v > from && v <= to;
    }).length;

    const percentage = total > 0 ? +((samplesInBin / total) * 100).toFixed(2) : 0;

    return {
      clase: i + 1,
      from,
      to,
      percentil_from: +(i * step).toFixed(4),
      percentil_to: +((i + 1) * step).toFixed(4),
      sampleCount: samplesInBin,
      percentage,
    };
  });
}

export async function runAssay(file: string, opts: AssayOptions = {}): Promise<AssayResult> {
  const targetCols = opts.cols && opts.cols.length > 0 ? opts.cols : undefined;
  const { headers, columns } = await parseColumns(file, 0, targetCols, opts.baseDir);
  const nClases = typeof opts.classes === 'string' ? parseInt(opts.classes) : (opts.classes ?? 6);
  const numCols = targetCols || headers.filter((h) => !SKIP.includes(h));
  const result: AssayResult = {};

  for (const col of numCols) {
    const rawList = columns[col] ?? [];
    if (!rawList.length) continue;

    let sentinelCount = 0;
    const validVals: number[] = [];

    for (const v of rawList) {
      if (isMiningSentinel(v)) {
        sentinelCount++;
      } else {
        const num = parseFloat(v);
        if (!isNaN(num)) {
          // Si el usuario no especificó incluir centinelas y es un valor negativo común de no-muestra
          if (num < 0 && (num === -99 || num === -999 || num === -9999)) {
            sentinelCount++;
          } else {
            validVals.push(num);
          }
        }
      }
    }

    if (!validVals.length) continue;

    const raw_min = getMin(validVals);
    const raw_max = getMax(validVals);
    const mean = getMean(validVals);
    const sorted = [...validVals].sort((a, b) => a - b);
    const median = getMedian(sorted);
    const variance = getVariance(validVals, mean);
    const stdDev = getStdDev(validVals, mean);
    const cv = getCoefficientOfVariation(stdDev, mean);

    result[col] = {
      raw_min,
      raw_max,
      count: validVals.length,
      validCount: validVals.length,
      sentinelCount,
      mean,
      median,
      stdDev,
      variance,
      cv,
      ranges: calcRanges(validVals, nClases),
    };
  }

  return result;
}

export function printAssay(result: AssayResult): void {
  console.log('\n=== ASSAY GRADE & STATISTICAL ANALYSIS ===');
  for (const [col, v] of Object.entries(result)) {
    console.log(`\nVariable: ${col}`);
    console.log(`  Rango Raw    : [${v.raw_min}, ${v.raw_max}]`);
    console.log(
      `  Muestras     : ${v.validCount} válidas` +
        (v.sentinelCount > 0 ? ` (${v.sentinelCount} centinelas excluidos)` : ''),
    );
    console.log(`  Media (μ)    : ${v.mean}`);
    console.log(`  Mediana (P50): ${v.median}`);
    console.log(`  Desv. Est (σ): ${v.stdDev} (Varianza: ${v.variance})`);
    console.log(`  Coef. Var CV : ${v.cv}`);
    console.log(`\n  Distribución por Clases de Percentil (${v.ranges.length} clases):`);
    console.log(
      `  ${'Clase'.padEnd(8)} ${'From'.padStart(10)} ${'To'.padStart(10)}   ${'Percentil'.padEnd(20)} ${'Muestras'.padStart(10)} ${'% Total'.padStart(8)}`,
    );
    console.log(`  ${'─'.repeat(72)}`);
    for (const r of v.ranges) {
      const pRange = `${r.percentil_from}% → ${r.percentil_to}%`;
      const countStr = r.sampleCount !== undefined ? String(r.sampleCount) : '-';
      const pctStr = r.percentage !== undefined ? `${r.percentage}%` : '-';
      console.log(
        `  ${String(r.clase).padEnd(8)} ${String(r.from).padStart(10)} ${String(r.to).padStart(10)}   ${pRange.padEnd(20)} ${countStr.padStart(10)} ${pctStr.padStart(8)}`,
      );
    }
  }
}

export default async function assayCmd(file: string, opts: AssayOptions) {
  const result = await runAssay(file, opts);
  printAssay(result);
  if (opts.output) {
    const f = exportData(result, 'assay_limits', opts.output as 'csv' | 'txt');
    const files = Array.isArray(f) ? f : [f];
    console.log(`\nExportado:`);
    files.forEach((file) => console.log(`  - ${file}`));
  }
  return result;
}
