import fs from 'fs';
import { parseFile } from '../core/parser.js';
import { log } from '@clack/prompts';

export function runAudit(filepath) {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Archivo no encontrado: ${filepath}`);
  }

  const raw = fs.readFileSync(filepath, 'utf8');
  const lines = raw.replace(/\r/g, '').split('\n').filter(Boolean);

  if (lines.length < 2) {
    throw new Error(`Archivo sin datos suficientes: ${filepath}`);
  }

  const firstLine = lines[0];
  const delim = firstLine.includes('\t') ? '\t' : ',';
  const headers = firstLine.split(delim).map(h => h.trim());

  let missingColumns = 0;
  let emptyValues = 0;
  let commaDecimals = 0;

  const emptyPerColumn = {};
  headers.forEach(h => emptyPerColumn[h] = 0);

  const dataLines = lines.slice(1);
  dataLines.forEach((line) => {
    const vals = line.split(delim);
    
    // Check if row has different number of columns than headers
    if (vals.length !== headers.length) {
      missingColumns++;
    }

    // Check for empty/null values and comma decimals
    headers.forEach((h, i) => {
      const val = vals[i]?.trim() ?? '';
      if (val === '') {
        emptyValues++;
        emptyPerColumn[h]++;
      } else {
        // Check for comma used as decimal
        if (/^-?\d+,\d+$/.test(val)) {
          commaDecimals++;
        }
      }
    });
  });

  return {
    filepath,
    totalRows: dataLines.length,
    headers,
    missingColumns,
    emptyValues,
    emptyPerColumn,
    commaDecimals
  };
}

export function printAudit(result) {
  const { filepath, totalRows, headers, missingColumns, emptyValues, emptyPerColumn, commaDecimals } = result;

  log.info(`--- Reporte de Auditoría para: ${filepath} ---`);
  log.info(`Total de filas: ${totalRows}`);
  log.info(`Total de columnas: ${headers.length} (${headers.join(', ')})`);
  
  if (missingColumns > 0) {
    log.warn(`Filas con columnas faltantes o sobrantes: ${missingColumns}`);
  } else {
    log.success(`Todas las filas coinciden con la cantidad de columnas.`);
  }

  if (emptyValues > 0) {
    log.warn(`Total de valores vacíos o nulos encontrados: ${emptyValues}`);
    headers.forEach(h => {
      if (emptyPerColumn[h] > 0) {
        log.warn(`  - Columna '${h}': ${emptyPerColumn[h]} valores vacíos`);
      }
    });
  } else {
    log.success(`No se encontraron valores vacíos o nulos.`);
  }

  if (commaDecimals > 0) {
    log.error(`ATENCIÓN: Se encontraron ${commaDecimals} valores que usan coma (,) como decimal.`);
    log.error(`Vulcan requiere el uso de punto (.) para los decimales.`);
  } else {
    log.success(`No se encontraron comas usadas como decimales.`);
  }

  log.info(`--- Fin del Reporte ---`);
}

export default function auditCmd(filepath, opts) {
  const result = runAudit(filepath);
  printAudit(result);
  return result;
}
