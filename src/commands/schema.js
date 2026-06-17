import { parseColumns } from '../core/parser.js';

function countDecimalsString(str) {
  // Manejo de notación científica (ej: 1e-8)
  if (str.toLowerCase().includes('e')) {
    const num = Number(str);
    if (!isNaN(num)) {
       let numStr = num.toFixed(20);
       // Remove trailing zeros
       numStr = numStr.replace(/0+$/, '');
       if (numStr.endsWith('.')) return 0;
       return numStr.split('.')[1]?.length || 0;
    }
  }
  if (!str.includes('.')) return 0;
  return str.split('.')[1].length;
}

export function runSchema(file, opts = {}) {
  // Leemos un máximo de 1000 filas para inferir
  const maxRows = opts.maxRows ? parseInt(opts.maxRows) : 1000;
  const { headers, columns } = parseColumns(file, maxRows);
  const result = {};

  const numRegex = /^-?\d*\.?\d+(e[-+]?\d+)?$/i;

  for (const col of headers) {
    const vals = columns[col].filter(v => v !== '');
    if (vals.length === 0) {
      result[col] = { type: 'text', reason: 'Vacío' };
      continue;
    }

    let isNumeric = true;
    let hasDecimals = false;
    let maxDecimals = 0;

    for (const val of vals) {
      if (!numRegex.test(val) || isNaN(Number(val))) {
        isNumeric = false;
        break;
      }
      
      const decimals = countDecimalsString(val);
      if (decimals > 0) {
        hasDecimals = true;
        if (decimals > maxDecimals) {
          maxDecimals = decimals;
        }
      }
    }

    if (!isNumeric) {
      result[col] = { type: 'text', reason: 'Contiene texto' };
    } else if (!hasDecimals) {
      result[col] = { type: 'integer', reason: 'Solo enteros' };
    } else if (maxDecimals > 7) {
      result[col] = { type: 'double', reason: `Máx decimales: ${maxDecimals} (> 7)` };
    } else {
      result[col] = { type: 'single', reason: `Máx decimales: ${maxDecimals} (<= 7)` };
    }
  }

  return result;
}

export function printSchema(result) {
  console.log('\n=== VULCAN DATA TYPES (SCHEMA) ===');
  console.log(`  ${'Columna'.padEnd(20)} ${'Tipo'.padEnd(10)} Razón`);
  console.log(`  ${'─'.repeat(50)}`);
  for (const [col, info] of Object.entries(result)) {
    console.log(`  ${col.padEnd(20)} ${info.type.padEnd(10)} ${info.reason}`);
  }
}

export default function schemaCmd(file, opts) {
  const result = runSchema(file, opts);
  printSchema(result);
  return result;
}
