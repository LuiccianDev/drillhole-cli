import fs from 'fs';
import path from 'path';
import type {
  AssayResult,
  CollarResult,
  LithoResult,
  Range,
  AuditResult,
  SchemaResult,
} from '../types/commands.js';

type ExportData = CollarResult | AssayResult | LithoResult | AuditResult | SchemaResult;

export type { ExportData };

export function exportData(
  data: ExportData,
  name: string,
  format: 'txt' | 'csv' = 'txt',
  outdir?: string,
): string | string[] {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.resolve(outdir ?? path.join(process.cwd(), 'exports'));

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 1. Exportación de Assays en CSV (un archivo por columna)
  if (name === 'assay_limits' && format === 'csv') {
    const files: string[] = [];
    const assayData = data as AssayResult;
    for (const [col, v] of Object.entries(assayData)) {
      const filename = `${name}_${col}_${timestamp}.csv`;
      const filepath = path.join(dir, filename);
      const headerStats = [
        `# Variable: ${col}`,
        `# Min: ${v.raw_min}, Max: ${v.raw_max}`,
        `# Media: ${v.mean}, Mediana: ${v.median}`,
        `# Desv_Est: ${v.stdDev}, CV: ${v.cv}`,
        `# Muestras_Validas: ${v.validCount}, Centinelas: ${v.sentinelCount}`,
      ].join('\n');

      const content = [
        headerStats,
        'Clase,From,To,Percentil_From,Percentil_To,Muestras,Porcentaje',
        ...v.ranges.map(
          (r: Range) =>
            `${r.clase},${r.from},${r.to},${r.percentil_from},${r.percentil_to},${r.sampleCount ?? 0},${r.percentage ?? 0}%`,
        ),
      ].join('\n');
      fs.writeFileSync(filepath, content);
      files.push(filepath);
    }
    return files;
  }

  const filename = `${name}_${timestamp}.${format}`;
  const filepath = path.join(dir, filename);

  let content = '';

  if (format === 'csv') {
    if (name === 'collar_limits') {
      const collarData = data as CollarResult;
      const rows = [
        'Parametro,Raw_Min,Raw_Max,Min_Boundary,Max_Boundary',
        `EASTING,${collarData.EASTING.raw_min},${collarData.EASTING.raw_max},${collarData.EASTING.min_boundary},${collarData.EASTING.max_boundary}`,
        `NORTHING,${collarData.NORTHING.raw_min},${collarData.NORTHING.raw_max},${collarData.NORTHING.min_boundary},${collarData.NORTHING.max_boundary}`,
        `ELEVATION,${collarData.ELEVATION.raw_min},${collarData.ELEVATION.raw_max},${collarData.ELEVATION.min_boundary},${collarData.ELEVATION.max_boundary}`,
      ];

      if (collarData.blockModel) {
        rows.push('');
        rows.push('Block_Model_Parameter,X,Y,Z');
        rows.push(
          `Origin,${collarData.blockModel.origin.x},${collarData.blockModel.origin.y},${collarData.blockModel.origin.z}`,
        );
        rows.push(
          `Extents_Delta,${collarData.blockModel.extents.dx},${collarData.blockModel.extents.dy},${collarData.blockModel.extents.dz}`,
        );
        rows.push(
          `Centroid,${collarData.blockModel.centroid.x},${collarData.blockModel.centroid.y},${collarData.blockModel.centroid.z}`,
        );
      }
      content = rows.join('\n');
    } else if (name === 'litho_values') {
      const lithoData = data as LithoResult;
      const details = lithoData._details;
      if (details) {
        content = 'Columna,Codigo,Frecuencia_Tramos,Porcentaje_Total\n';
        for (const [col, colDetails] of Object.entries(details)) {
          for (const d of colDetails) {
            content += `${col},${d.code},${d.count},${d.percentage}%\n`;
          }
        }
      } else {
        content = 'Columna,Valor\n';
        for (const [col, vals] of Object.entries(lithoData)) {
          if (col === '_details' || !Array.isArray(vals)) continue;
          content += (vals as string[]).map((v) => `${col},${v}`).join('\n') + '\n';
        }
      }
    } else if (name === 'audit_report') {
      const auditData = data as AuditResult;
      const rows = [
        'Severidad,Tipo,Fila,Pozo,Columna,Valor,Mensaje',
        ...auditData.findings.map(
          (f) =>
            `"${f.severity}","${f.type}","${f.rowNumber ?? ''}","${f.holeId ?? ''}","${f.column ?? ''}","${f.value ?? ''}","${f.message.replace(/"/g, '""')}"`,
        ),
      ];
      content = rows.join('\n');
    } else if (name === 'schema_report') {
      const schemaData = data as SchemaResult;
      const rows = [
        'Columna,Tipo_Vulcan,Longitud_Maxima,Es_Fecha',
        ...schemaData.map((s) => `"${s.column}","${s.type}",${s.maxLength},${Boolean(s.isDate)}`),
      ];
      content = rows.join('\n');
    }
  } else {
    // Formato TXT / Formateado para lectura técnica
    if (name === 'audit_report') {
      const auditData = data as AuditResult;
      content = [
        '=== REPORTE DE AUDITORIA Y CONTROL DE CALIDAD GEOLOGICA ===',
        `Tipo de Archivo Detectado : ${auditData.detectedType.toUpperCase()}`,
        `Total Filas               : ${auditData.stats.total_rows}`,
        `Total Columnas            : ${auditData.stats.columns}`,
        `Total Nulos               : ${auditData.stats.nulls}`,
        `Columnas Numericas        : ${auditData.stats.numeric_cols}`,
        '',
        '--- RESUMEN DE HALLAZGOS ---',
        `Hallazgos Criticos (CRITICAL) : ${auditData.stats.critical_findings}`,
        `Advertencias (WARNING)        : ${auditData.stats.warning_findings}`,
        `Informativos (INFO)           : ${auditData.stats.info_findings}`,
        '',
        '--- DETALLE DE HALLAZGOS ---',
        ...auditData.findings.map(
          (f, idx) =>
            `[${idx + 1}] [${f.severity}] (${f.type}) Fila:${f.rowNumber ?? '-'} Pozo:${f.holeId ?? '-'} Col:${f.column ?? '-'}: ${f.message}`,
        ),
      ].join('\n');
    } else if (name === 'schema_report') {
      const schemaData = data as SchemaResult;
      content = [
        '=== ESPECIFICACION DE ESQUEMA VULCAN ===',
        '',
        'CAMPO'.padEnd(20) + 'TIPO VULCAN'.padEnd(16) + 'LONGITUD'.padStart(10),
        '-'.repeat(46),
        ...schemaData.map(
          (s) => s.column.padEnd(20) + s.type.padEnd(16) + String(s.maxLength).padStart(10),
        ),
      ].join('\n');
    } else {
      content = JSON.stringify(data, null, 2);
    }
  }

  fs.writeFileSync(filepath, content);
  return filepath;
}
