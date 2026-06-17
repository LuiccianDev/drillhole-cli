import { parseColumns } from '../core/parser.js';
import { exportData } from './export.js';

export function runLitho(file, opts = {}) {
  const { headers, columns } = parseColumns(file);
  const selectedCols = opts.cols && opts.cols.length > 0 ? opts.cols : [opts.col ?? 'ROCK'];
  const result = {};

  for (const col of selectedCols) {
    if (!headers.includes(col)) continue;

    const uniqueValues = new Set();
    for (const val of columns[col]) {
      const trimmed = String(val).trim();
      if (!trimmed || trimmed.toUpperCase() === 'NS') continue;
      uniqueValues.add(trimmed);
    }

    result[col] = Array.from(uniqueValues).sort((a, b) => {
      // Try numeric sort if both are numbers
      if (!isNaN(a) && !isNaN(b)) return parseFloat(a) - parseFloat(b);
      return a.localeCompare(b);
    });
  }

  return result;
}

export function printLitho(result) {
  for (const [col, codes] of Object.entries(result)) {
    console.log(`\n=== UNIQUE VALUES: ${col} ===`);
    console.log(`Total códigos: ${codes.length}\n`);
    for (const code of codes) {
      console.log(`  ${code}`);
    }
  }
}

export default function lithoCmd(file, opts) {
  const result = runLitho(file, opts);
  printLitho(result);
  
  if (opts.output) {
    console.log(`\nExportado:`);
    for (const [col, codes] of Object.entries(result)) {
      const f = exportData(codes, `litho_${col}`, opts.output);
      console.log(`  - ${f}`);
    }
  }
  return result;
}
