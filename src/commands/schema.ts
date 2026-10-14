import { parseColumns } from '../core/parser.js';
import { exportData } from './export.js';
import type { SchemaResult, VulcanDataType, SchemaOptions } from '../types/index.js';

const DATE_REGEX = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/;

export async function runSchema(file: string, opts: SchemaOptions = {}): Promise<SchemaResult> {
  // Analizamos una muestra amplia para inferir tipos con seguridad
  const { headers, columns } = await parseColumns(file, 500, undefined, opts.baseDir);

  const schema: SchemaResult = headers.map((h) => {
    const vals = (columns[h] ?? []).filter(Boolean);
    if (!vals.length) return { column: h, type: 'text (empty)', maxLength: 0 };

    let isNumeric = true;
    let hasDecimals = false;
    let maxLen = 0;
    let isAllDates = true;

    for (const v of vals) {
      if (isNaN(Number(v))) {
        isNumeric = false;
      } else {
        if (v.includes('.')) hasDecimals = true;
      }

      if (!DATE_REGEX.test(v.trim())) {
        isAllDates = false;
      }

      if (v.length > maxLen) maxLen = v.length;
    }

    let type: VulcanDataType = 'text';
    if (isNumeric) {
      if (hasDecimals) {
        type = maxLen > 10 ? 'double' : 'single';
      } else {
        type = 'integer';
      }
    }

    return {
      column: h,
      type,
      maxLength: maxLen,
      isDate: !isNumeric && isAllDates,
    };
  });

  return schema;
}

export function printSchema(schema: SchemaResult) {
  console.log('\n=== INFERRED VULCAN SCHEMA ===');
  console.table(
    schema.map((s) => ({
      Columna: s.column,
      'Tipo Vulcan': s.type,
      'Longitud Max': s.maxLength,
      Formato: s.isDate ? 'Date (YYYY-MM-DD)' : s.type,
    })),
  );
  console.log('\nTipos Vulcan Oficiales:');
  console.log(' - integer: Entero de 4 bytes (ej. identificadores, códigos numéricos)');
  console.log(' - single : Flotante de precisión simple (ej. leyes, porcentajes)');
  console.log(' - double : Flotante de doble precisión (ej. coordenadas UTM Este/Norte)');
  console.log(' - text   : Cadena alfanumérica / nombres y litologías');
}

export default async function schemaCmd(file: string, opts: SchemaOptions = {}) {
  const result = await runSchema(file, opts);
  printSchema(result);
  if (opts.output) {
    const f = exportData(result, 'schema_report', opts.output as 'csv' | 'txt');
    console.log(`\nExportado: ${f}`);
  }
  return result;
}
