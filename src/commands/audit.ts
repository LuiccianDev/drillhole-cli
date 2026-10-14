import { parseFile, isMiningSentinel } from '../core/parser.js';
import { exportData } from './export.js';
import type {
  AuditResult,
  ColumnAudit,
  AuditOptions,
  FindingItem,
} from '../types/index.js';
import { COLLAR_COLUMN_MAP, INTERVAL_COLUMN_MAP } from '../constants/mining.js';

export async function runAudit(file: string, opts: AuditOptions = {}): Promise<AuditResult> {
  const { headers, rows } = await parseFile(file, opts.baseDir);

  const stats = {
    total_rows: rows.length,
    columns: headers.length,
    nulls: 0,
    numeric_cols: 0,
    critical_findings: 0,
    warning_findings: 0,
    info_findings: 0,
  };

  const colInfo: ColumnAudit[] = headers.map((h) => {
    let nullCount = 0;
    let isNumeric = true;

    rows.forEach((r) => {
      const val = r[h];
      if (val === undefined || val === '' || isMiningSentinel(val)) {
        nullCount++;
      }
      if (val !== undefined && val !== '' && !isMiningSentinel(val) && isNaN(Number(val))) {
        isNumeric = false;
      }
    });

    if (isNumeric) stats.numeric_cols++;
    stats.nulls += nullCount;

    return { header: h, nulls: nullCount, numeric: isNumeric };
  });

  const upperHeaders = headers.map((h) => h.toUpperCase());
  const findH = (aliases: readonly string[]) =>
    headers[upperHeaders.findIndex((uh) => aliases.includes(uh))];

  const holeCol = findH(INTERVAL_COLUMN_MAP.HOLE_ID);
  const fromCol = findH(INTERVAL_COLUMN_MAP.FROM);
  const toCol = findH(INTERVAL_COLUMN_MAP.TO);
  const eastCol = findH(COLLAR_COLUMN_MAP.EASTING);
  const northCol = findH(COLLAR_COLUMN_MAP.NORTHING);
  const elevCol = findH(COLLAR_COLUMN_MAP.ELEVATION);
  const lenCol = findH(COLLAR_COLUMN_MAP.LENGTH);

  let detectedType: 'collar' | 'interval' | 'litho' | 'generic' = 'generic';
  if (fromCol && toCol) {
    detectedType = 'interval';
  } else if (eastCol && northCol) {
    detectedType = 'collar';
  } else if (upperHeaders.some((h) => h.includes('LITHO') || h.includes('ROCK'))) {
    detectedType = 'litho';
  }

  const findings: FindingItem[] = [];

  // 1. Validaciones para archivos tipo INTERVALO (Assay, Lithology, etc.)
  if (fromCol && toCol) {
    interface IntervalRow {
      idx: number;
      hole: string;
      from: number;
      to: number;
    }

    const holeGroups = new Map<string, IntervalRow[]>();

    rows.forEach((r, i) => {
      const rowNum = i + 2; // considerando encabezado como fila 1
      const hole = holeCol ? (r[holeCol]?.trim() || `Row_${rowNum}`) : 'GENERAL';
      const rawFrom = r[fromCol]?.trim();
      const rawTo = r[toCol]?.trim();

      const fromVal = parseFloat(rawFrom ?? '');
      const toVal = parseFloat(rawTo ?? '');

      if (!isNaN(fromVal) && !isNaN(toVal)) {
        // Intervalo invertido o de longitud nula
        if (fromVal >= toVal) {
          findings.push({
            type: 'INVERTED_INTERVAL',
            severity: 'CRITICAL',
            rowNumber: rowNum,
            holeId: hole,
            column: `${fromCol} / ${toCol}`,
            value: `${fromVal} -> ${toVal}`,
            message: `Intervalo invertido o nulo: FROM (${fromVal}) >= TO (${toVal})`,
          });
        }

        if (!holeGroups.has(hole)) {
          holeGroups.set(hole, []);
        }
        holeGroups.get(hole)!.push({ idx: rowNum, hole, from: fromVal, to: toVal });
      }
    });

    // Validar solapamientos (OVERLAP) y discontinuidades (GAP) por sondaje
    for (const [holeId, intervals] of holeGroups.entries()) {
      intervals.sort((a, b) => a.from - b.from);

      for (let j = 1; j < intervals.length; j++) {
        const prev = intervals[j - 1]!;
        const curr = intervals[j]!;

        if (curr.from < prev.to) {
          findings.push({
            type: 'OVERLAP',
            severity: 'WARNING',
            rowNumber: curr.idx,
            holeId,
            column: `${fromCol} / ${toCol}`,
            value: `FROM ${curr.from} < TO ${prev.to}`,
            message: `Solapamiento de intervalos: tramo (${curr.from}-${curr.to}) se solapa con previo (${prev.from}-${prev.to})`,
          });
        } else if (curr.from > prev.to) {
          findings.push({
            type: 'GAP',
            severity: 'INFO',
            rowNumber: curr.idx,
            holeId,
            column: `${fromCol} / ${toCol}`,
            value: `GAP: ${prev.to} -> ${curr.from}`,
            message: `Discontinuidad / tramo no muestreado entre ${prev.to}m y ${curr.from}m`,
          });
        }
      }
    }
  }

  // 2. Validaciones para archivos tipo COLLAR
  if (detectedType === 'collar' && eastCol && northCol) {
    const seenHoles = new Set<string>();

    rows.forEach((r, i) => {
      const rowNum = i + 2;
      const hole = holeCol ? r[holeCol]?.trim() : undefined;

      if (hole) {
        if (seenHoles.has(hole.toUpperCase())) {
          findings.push({
            type: 'DUPLICATE_HOLE',
            severity: 'CRITICAL',
            rowNumber: rowNum,
            holeId: hole,
            column: holeCol,
            value: hole,
            message: `Sondaje duplicado: '${hole}' ya existe en el archivo Collar`,
          });
        } else {
          seenHoles.add(hole.toUpperCase());
        }
      }

      const east = parseFloat(r[eastCol] ?? '');
      const north = parseFloat(r[northCol] ?? '');
      const elev = elevCol ? parseFloat(r[elevCol] ?? '') : undefined;

      if (isNaN(east) || isNaN(north) || (east === 0 && north === 0)) {
        findings.push({
          type: 'INVALID_COORD',
          severity: 'CRITICAL',
          rowNumber: rowNum,
          holeId: hole,
          column: `${eastCol}, ${northCol}`,
          value: `(${r[eastCol]}, ${r[northCol]})`,
          message: `Coordenadas inválidas o en origen (0,0): X=${r[eastCol]}, Y=${r[northCol]}`,
        });
      }

      if (lenCol) {
        const len = parseFloat(r[lenCol] ?? '');
        if (isNaN(len) || len <= 0) {
          findings.push({
            type: 'INVALID_LENGTH',
            severity: 'CRITICAL',
            rowNumber: rowNum,
            holeId: hole,
            column: lenCol,
            value: r[lenCol],
            message: `Profundidad total (EOH) inválida o menor/igual a cero: ${r[lenCol]}`,
          });
        }
      }
    });
  }

  // 3. Validaciones de Centinelas y Límites Físicos en Ensayos
  colInfo
    .filter((c) => c.numeric)
    .forEach((col) => {
      const isPercentCol =
        col.header.includes('%') ||
        col.header.toUpperCase().includes('PCT') ||
        col.header.toUpperCase().startsWith('CUT') ||
        col.header.toUpperCase().startsWith('FE');

      rows.forEach((r, i) => {
        const rowNum = i + 2;
        const raw = r[col.header];
        if (raw === undefined || raw === '') return;

        if (isMiningSentinel(raw)) {
          findings.push({
            type: 'SENTINEL_VALUE',
            severity: 'INFO',
            rowNumber: rowNum,
            holeId: holeCol ? r[holeCol] : undefined,
            column: col.header,
            value: raw,
            message: `Código centinela minero '${raw}' detectado en columna numérica`,
          });
          return;
        }

        const numVal = parseFloat(raw);
        if (!isNaN(numVal)) {
          if (isPercentCol && numVal > 100) {
            findings.push({
              type: 'PHYSICAL_LIMIT',
              severity: 'WARNING',
              rowNumber: rowNum,
              holeId: holeCol ? r[holeCol] : undefined,
              column: col.header,
              value: numVal,
              message: `Ley porcentual excede el límite físico del 100%: ${numVal}%`,
            });
          } else if (numVal < 0) {
            findings.push({
              type: 'PHYSICAL_LIMIT',
              severity: 'WARNING',
              rowNumber: rowNum,
              holeId: holeCol ? r[holeCol] : undefined,
              column: col.header,
              value: numVal,
              message: `Ley numérica negativa detectada: ${numVal}`,
            });
          }
        }
      });
    });

  stats.critical_findings = findings.filter((f) => f.severity === 'CRITICAL').length;
  stats.warning_findings = findings.filter((f) => f.severity === 'WARNING').length;
  stats.info_findings = findings.filter((f) => f.severity === 'INFO').length;

  return { stats, colInfo, findings, detectedType };
}

export function printAudit(result: AuditResult) {
  const { stats, colInfo, findings, detectedType } = result;
  console.log('\n=== GEOLOGICAL AUDIT & QA/QC REPORT ===');
  console.log(`Detected File Type : ${detectedType.toUpperCase()}`);
  console.log(`Total Rows         : ${stats.total_rows}`);
  console.log(`Total Columns      : ${stats.columns}`);
  console.log(`Total Nulls        : ${stats.nulls}`);
  console.log(`Numeric Cols       : ${stats.numeric_cols}`);

  console.log('\nFindings Summary:');
  console.log(`  ✖ CRITICAL : ${stats.critical_findings}`);
  console.log(`  ⚠ WARNING  : ${stats.warning_findings}`);
  console.log(`  ℹ INFO     : ${stats.info_findings}`);

  if (findings.length > 0) {
    console.log('\nDetailed Findings (sample):');
    const preview = findings.slice(0, 12);
    preview.forEach((f) => {
      const tag =
        f.severity === 'CRITICAL'
          ? '✖ [CRITICAL]'
          : f.severity === 'WARNING'
            ? '⚠ [WARNING]'
            : 'ℹ [INFO]';
      const loc = [
        f.rowNumber ? `Fila ${f.rowNumber}` : '',
        f.holeId ? `Pozo: ${f.holeId}` : '',
        f.column ? `Col: ${f.column}` : '',
      ]
        .filter(Boolean)
        .join(' | ');
      console.log(`  ${tag} ${loc} -> ${f.message}`);
    });
    if (findings.length > 12) {
      console.log(`  ... y ${findings.length - 12} hallazgos adicionales.`);
    }
  } else {
    console.log('\n✔ No se detectaron anomalías ni inconsistencias geológicas en este archivo.');
  }

  console.log('\nColumn Detail:');
  console.table(colInfo);
}

export default async function auditCmd(file: string, opts: AuditOptions = {}) {
  const result = await runAudit(file, opts);
  printAudit(result);
  if (opts.output) {
    const f = exportData(result, 'audit_report', opts.output as 'csv' | 'txt');
    console.log(`\nExportado: ${f}`);
  }
  return result;
}
