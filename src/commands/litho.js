import { parseColumns } from '../parser.js';
import { exportData } from './export.js';

export function runLitho(file, opts = {}) {
  const { headers, columns } = parseColumns(file);
  const minFreq = parseInt(opts.freq ?? 0);
  const col = opts.col ?? 'RX_CODE';

  if (!headers.includes(col)) {
    throw new Error(`Columna "${col}" no existe. Disponibles: ${headers.join(', ')}`);
  }

  const freq = {};
  for (const val of columns[col]) {
    if (!val || val === 'NS') continue;
    freq[val] = (freq[val] || 0) + 1;
  }

  const filtered = Object.entries(freq)
    .filter(([, f]) => f >= minFreq)
    .sort((a, b) => b[1] - a[1]);

  return Object.fromEntries(
    filtered.map(([code, count]) => [code, { frequency: count }])
  );
}

export function printLitho(result, col) {
  console.log(`\n=== UNIQUE VALUES: ${col} ===`);
  console.log(`Total códigos: ${Object.keys(result).length}\n`);
  for (const [code] of Object.entries(result)) {
    console.log(`  ${code}`);
  }
}

export default function lithoCmd(file, opts) {
  const col = opts.col ?? 'RX_CODE';
  const result = runLitho(file, opts);
  printLitho(result, col);
  if (opts.output) {
    const f = exportData(result, `litho_${col}`, opts.output);
    console.log(`\nExportado: ${f}`);
  }
  return result;
}