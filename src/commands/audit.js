import fs from 'fs';
import { parseFile } from '../parser.js';
import { log } from '@clack/prompts';

export default function auditCmd(filepath, opts) {
  let data;
  try {
    data = parseFile(filepath);
  } catch (err) {
    throw new Error(`Error al leer el archivo: ${err.message}`);
  }

  const { headers, rows, delim } = data;

  let missingColumns = 0;
  let emptyValues = 0;
  let commaDecimals = 0;

  const emptyPerColumn = {};
  headers.forEach(h => emptyPerColumn[h] = 0);

  rows.forEach((row, rowIndex) => {
    // Check if row has different number of columns than headers
    const rowKeys = Object.keys(row);
    if (rowKeys.length !== headers.length) {
      missingColumns++;
    }

    // Check for empty/null values and comma decimals
    headers.forEach(h => {
      const val = row[h];
      if (val === undefined || val === null || val === '') {
        emptyValues++;
        emptyPerColumn[h]++;
      } else {
        // Check for comma used as decimal
        // A simple regex: digits followed by comma followed by digits
        if (/^-?\d+,\d+$/.test(val)) {
          commaDecimals++;
        }
      }
    });
  });

  log.info(`--- Reporte de Auditoría para: ${filepath} ---`);
  log.info(`Total de filas: ${rows.length}`);
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
