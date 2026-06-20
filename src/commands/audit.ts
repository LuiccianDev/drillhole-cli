import { parseFile } from '../core/parser.js';
import type { AuditResult, ColumnAudit } from '../types/index.js';

export async function runAudit(file: string): Promise<AuditResult> {
  const { headers, rows } = await parseFile(file);
  
  const stats = {
    total_rows: rows.length,
    columns: headers.length,
    nulls: 0,
    numeric_cols: 0,
  };

  const colInfo: ColumnAudit[] = headers.map(h => {
    let nullCount = 0;
    let isNumeric = true;
    
    rows.forEach(r => {
      if (!r[h]) nullCount++;
      if (r[h] && isNaN(Number(r[h]))) isNumeric = false;
    });

    if (isNumeric) stats.numeric_cols++;
    stats.nulls += nullCount;

    return { header: h, nulls: nullCount, numeric: isNumeric };
  });

  return { stats, colInfo };
}

export function printAudit(result: AuditResult) {
  const { stats, colInfo } = result;
  console.log('\n=== AUDIT REPORT ===');
  console.log(`Total Rows   : ${stats.total_rows}`);
  console.log(`Total Columns: ${stats.columns}`);
  console.log(`Total Nulls  : ${stats.nulls}`);
  console.log(`Numeric Cols : ${stats.numeric_cols}`);

  console.log('\nColumn Detail:');
  console.table(colInfo);
}

export default async function auditCmd(file: string, opts: Record<string, any>) {
  const result = await runAudit(file);
  printAudit(result);
  return result;
}
