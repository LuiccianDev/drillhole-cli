import { parseColumns } from '../core/parser.js';
import { SchemaResult, VulcanDataType } from '../types/index.js';

export async function runSchema(file: string): Promise<SchemaResult> {
  // Solo necesitamos una muestra para inferir tipos, pero por seguridad analizamos más
  const { headers, columns } = await parseColumns(file, 500);
  
  const schema: SchemaResult = headers.map(h => {
    const vals = (columns[h] || []).filter(Boolean);
    if (!vals.length) return { column: h, type: 'text (empty)', maxLength: 0 };

    let isNumeric = true;
    let hasDecimals = false;
    let maxLen = 0;

    for (const v of vals) {
      if (isNaN(Number(v))) {
        isNumeric = false;
      } else {
        if (v.includes('.')) hasDecimals = true;
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

    return { column: h, type, maxLength: maxLen };
  });

  return schema;
}

export function printSchema(schema: SchemaResult) {
  console.log('\n=== INFERRED VULCAN SCHEMA ===');
  console.table(schema);
  console.log('\nTipos Sugeridos:');
  console.log(' - integer: Números enteros');
  console.log(' - single : Decimales cortos');
  console.log(' - double : Decimales de alta precisión');
  console.log(' - text   : Cadenas de caracteres');
}

export default async function schemaCmd(file: string, opts: Record<string, any>) {
  const result = await runSchema(file);
  printSchema(result);
  return result;
}
