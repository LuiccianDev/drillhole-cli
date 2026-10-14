import { runCollar } from '../src/commands/collar.js';
import { runAssay } from '../src/commands/assay.js';
import { runLitho } from '../src/commands/litho.js';
import { runAudit } from '../src/commands/audit.js';
import { runSchema } from '../src/commands/schema.js';
import { parseFile, parseDelimitedLine, isMiningSentinel } from '../src/core/parser.js';
import { exportData } from '../src/commands/export.js';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ✔ ${label}`);
    passed++;
  } else {
    console.error(`  ✘ ${label}`);
    failed++;
  }
}

async function runTests() {
  const DATA_DIR = path.join(process.cwd(), 'data_tests');
  const getPath = (file: string) => path.join(DATA_DIR, file);

  // ── COLLAR sin buffer ─────────────────────────────────────────────────────────
  console.log('\n[collar — sin buffer]');
  const collar = await runCollar(getPath('header.txt'));

  // Estructura
  assert('tiene EASTING', 'EASTING' in collar);
  assert('tiene NORTHING', 'NORTHING' in collar);
  assert('tiene ELEVATION', 'ELEVATION' in collar);
  assert('tiene LENGTH', 'LENGTH' in collar);

  // EASTING redondeo centena
  assert('EASTING min_boundary es múltiplo de 100', collar.EASTING.min_boundary % 100 === 0);
  assert('EASTING max_boundary es múltiplo de 100', collar.EASTING.max_boundary % 100 === 0);
  assert('EASTING min_boundary <= raw_min', collar.EASTING.min_boundary <= collar.EASTING.raw_min);
  assert('EASTING max_boundary >= raw_max', collar.EASTING.max_boundary >= collar.EASTING.raw_max);

  // NORTHING redondeo centena
  assert('NORTHING min_boundary es múltiplo de 100', collar.NORTHING.min_boundary % 100 === 0);
  assert('NORTHING max_boundary es múltiplo de 100', collar.NORTHING.max_boundary % 100 === 0);
  assert('NORTHING min_boundary <= raw_min', collar.NORTHING.min_boundary <= collar.NORTHING.raw_min);
  assert('NORTHING max_boundary >= raw_max', collar.NORTHING.max_boundary >= collar.NORTHING.raw_max);

  // ELEVATION lógica Z
  assert('ELEVATION tiene max_length', 'max_length' in collar.ELEVATION);
  assert(
    'ELEVATION min_boundary <= raw_min - max_length',
    collar.ELEVATION.min_boundary <= collar.ELEVATION.raw_min - collar.ELEVATION.max_length,
  );
  assert('ELEVATION max_boundary >= raw_max', collar.ELEVATION.max_boundary >= collar.ELEVATION.raw_max);
  assert('ELEVATION min_boundary es múltiplo de 10', collar.ELEVATION.min_boundary % 10 === 0);
  assert('ELEVATION max_boundary es múltiplo de 10', collar.ELEVATION.max_boundary % 10 === 0);

  // Vulcan Block Model Grid Bounds
  assert('tiene blockModel', collar.blockModel !== undefined);
  if (collar.blockModel) {
    assert('blockModel tiene origin X, Y, Z', collar.blockModel.origin.x === collar.EASTING.min_boundary);
    assert('blockModel DX > 0', collar.blockModel.extents.dx > 0);
    assert('blockModel DY > 0', collar.blockModel.extents.dy > 0);
    assert('blockModel DZ > 0', collar.blockModel.extents.dz > 0);
    assert('blockModel centroid X está centrado', collar.blockModel.centroid.x === collar.EASTING.min_boundary + collar.blockModel.extents.dx / 2);
  }

  // ── COLLAR con buffer 100 ─────────────────────────────────────────────────────
  console.log('\n[collar — buffer 100]');
  const collarBuf = await runCollar(getPath('header.txt'), { buffer: '100' });

  // XY buffer = 100
  assert('EASTING  min con buffer < sin buffer', collarBuf.EASTING.min_boundary < collar.EASTING.min_boundary);
  assert('EASTING  max con buffer > sin buffer', collarBuf.EASTING.max_boundary > collar.EASTING.max_boundary);

  // ── ASSAY ──────────────────────────────────────────────────────────
  console.log('\n[assay — 6 clases y estadisticas]');
  const assay = await runAssay(getPath('assays.txt'));
  assert('tiene CUT%', 'CUT%' in assay);
  assert('raw_min >= 0', assay['CUT%'].raw_min >= 0);
  assert('raw_min < raw_max', assay['CUT%'].raw_min < assay['CUT%'].raw_max);
  assert('count > 0', assay['CUT%'].count > 0);
  assert('tiene ranges', Array.isArray(assay['CUT%'].ranges));
  assert('ranges tiene 6 clases por defecto', assay['CUT%'].ranges.length === 6);

  // Nuevas estadísticas mineras
  const cutStats = assay['CUT%'];
  assert('tiene media (mean)', typeof cutStats.mean === 'number' && cutStats.mean > 0);
  assert('tiene mediana (median)', typeof cutStats.median === 'number' && cutStats.median > 0);
  assert('tiene desv. estándar (stdDev)', typeof cutStats.stdDev === 'number' && cutStats.stdDev >= 0);
  assert('tiene coeficiente de variacion (cv)', typeof cutStats.cv === 'number' && cutStats.cv >= 0);
  assert('rango 1 tiene conteo de muestras', cutStats.ranges[0]!.sampleCount !== undefined);
  assert('rango 1 tiene porcentaje', cutStats.ranges[0]!.percentage !== undefined);

  // ── LITHO ──────────────────────────────────────────────────────────
  console.log('\n[litho — sin filtro y con frecuencias]');
  const litho = await runLitho(getPath('litho.txt'), { cols: ['RX_CODE'] });
  assert('tiene resultados', litho['RX_CODE'].length > 0);
  assert('es un array ordenado', Array.isArray(litho['RX_CODE']));
  assert('tiene _details', litho._details !== undefined && Array.isArray(litho._details['RX_CODE']));
  const rxDetails = litho._details?.['RX_CODE'] ?? [];
  assert('los detalles tienen conteo y porcentaje', rxDetails[0]!.count > 0 && rxDetails[0]!.percentage > 0);

  // ── PARSER ROBUSTO (COMILLAS Y BOM) ───────────────────────────────────────────
  console.log('\n[parser — quotes & BOM]');
  const quotedLine = '"HOLE_01","Lithology, altered breccia",12.5';
  const parsedCols = parseDelimitedLine(quotedLine, ',');
  assert('parseDelimitedLine respeta coma dentro de comillas', parsedCols.length === 3);
  assert('columna 2 conserva texto limpio', parsedCols[1] === 'Lithology, altered breccia');

  const fBom = 'test_bom.csv';
  fs.writeFileSync(fBom, '\uFEFFID,FROM,TO\nDH01,0,10');
  const parsedBom = await parseFile(fBom);
  assert('elimina BOM UTF-8 del primer encabezado', parsedBom.headers[0] === 'ID');
  fs.unlinkSync(fBom);

  assert('isMiningSentinel detecta -999', isMiningSentinel('-999'));
  assert('isMiningSentinel detecta NA', isMiningSentinel('NA'));
  assert('isMiningSentinel no descarta valor numérico 1.25', !isMiningSentinel('1.25'));

  // ── AUDITORÍA Y HALLAZGOS GEOLÓGICOS (VULCAN QA/QC) ───────────────────────────
  console.log('\n[audit — findings & QA/QC]');
  // Archivo con errores intencionales para verificar detección
  const fAnomalies = 'test_anomalies.csv';
  const csvContent = [
    'HOLE_ID,FROM,TO,CUT%',
    'DH01,0,10,0.5',
    'DH01,15,10,0.8',    // Inverted interval: FROM 15 >= TO 10
    'DH02,0,10,0.3',
    'DH02,8,20,0.4',     // Overlap: 8 < prev_TO 10
    'DH02,25,30,-999',   // Sentinel value
    'DH02,30,40,150.0',  // Physical limit > 100%
  ].join('\n');

  fs.writeFileSync(fAnomalies, csvContent);
  const auditRes = await runAudit(fAnomalies);

  assert('detecta tipo interval', auditRes.detectedType === 'interval');
  assert('detecta hallazgos criticos > 0', auditRes.stats.critical_findings > 0);
  assert('detecta advertencias > 0', auditRes.stats.warning_findings > 0);

  const hasInverted = auditRes.findings.some((f) => f.type === 'INVERTED_INTERVAL');
  const hasOverlap = auditRes.findings.some((f) => f.type === 'OVERLAP');
  const hasSentinel = auditRes.findings.some((f) => f.type === 'SENTINEL_VALUE');
  const hasPhysLimit = auditRes.findings.some((f) => f.type === 'PHYSICAL_LIMIT');

  assert('detecta INVERTED_INTERVAL', hasInverted);
  assert('detecta OVERLAP', hasOverlap);
  assert('detecta SENTINEL_VALUE', hasSentinel);
  assert('detecta PHYSICAL_LIMIT (>100%)', hasPhysLimit);

  fs.unlinkSync(fAnomalies);

  // Archivo de collar con duplicado y coordenadas cero
  const fCollarErr = 'test_collar_err.csv';
  const collarErrContent = [
    'HOLE_ID,EASTING,NORTHING,ELEVATION,LENGTH',
    'DH01,1000,2000,100,50',
    'DH01,1000,2000,100,50', // Duplicado
    'DH02,0,0,100,50',        // Origen (0,0)
    'DH03,1500,2500,100,-10', // Longitud negativa
  ].join('\n');
  fs.writeFileSync(fCollarErr, collarErrContent);
  const auditCollar = await runAudit(fCollarErr);

  assert('detecta tipo collar', auditCollar.detectedType === 'collar');
  assert('detecta DUPLICATE_HOLE', auditCollar.findings.some((f) => f.type === 'DUPLICATE_HOLE'));
  assert('detecta INVALID_COORD', auditCollar.findings.some((f) => f.type === 'INVALID_COORD'));
  assert('detecta INVALID_LENGTH', auditCollar.findings.some((f) => f.type === 'INVALID_LENGTH'));

  fs.unlinkSync(fCollarErr);

  // ── AUDIT CLEAN ───────────────────────────────────────────────────────────────
  const fClean = 'test_clean.csv';
  fs.writeFileSync(fClean, 'ID,VAL\n1,10.5\n2,20.0');
  const auditClean = await runAudit(fClean);
  assert('audit clean: total_rows is 2', auditClean.stats.total_rows === 2);
  fs.unlinkSync(fClean);

  // ── SCHEMA ───────────────────────────────────────────────────────────────────
  console.log('\n[schema — logic]');
  const fSchema = 'test_schema.csv';
  fs.writeFileSync(fSchema, 'TXT,INT,SNG,DBL,FECHA\nA,1,1.1,1.123456789123,2026-05-12\nB,2,2.2,2.2,2026-05-13');
  const schema = await runSchema(fSchema);

  const getType = (col: string) => schema.find((s) => s.column === col)?.type;
  assert('TXT is text', getType('TXT') === 'text');
  assert('INT is integer', getType('INT') === 'integer');
  assert('SNG is single', getType('SNG') === 'single');
  assert('DBL is double', getType('DBL') === 'double');
  assert('FECHA detecta date format', schema.find((s) => s.column === 'FECHA')?.isDate === true);

  fs.unlinkSync(fSchema);

  // ── EXPORTACIÓN UNIVERSAL ─────────────────────────────────────────────────────
  console.log('\n[export — audit & schema]');
  const exportedAuditCsv = exportData(auditClean, 'audit_report', 'csv');
  assert('exportData genera reporte de auditoría CSV', typeof exportedAuditCsv === 'string' && fs.existsSync(exportedAuditCsv));
  if (typeof exportedAuditCsv === 'string' && fs.existsSync(exportedAuditCsv)) {
    fs.unlinkSync(exportedAuditCsv);
  }

  const exportedSchemaCsv = exportData(schema, 'schema_report', 'csv');
  assert('exportData genera reporte de esquema CSV', typeof exportedSchemaCsv === 'string' && fs.existsSync(exportedSchemaCsv));
  if (typeof exportedSchemaCsv === 'string' && fs.existsSync(exportedSchemaCsv)) {
    fs.unlinkSync(exportedSchemaCsv);
  }

  // ── DYNAMIC RUNNER & AUTO-DETECTION ───────────────────────────────────────────
  console.log('\n[runner — dynamic file resolution & auto-detection]');
  const { runNonInteractive } = await import('../src/runner.js');
  
  // Test auto-detection in data_tests without passing file
  let autoDetectedCollarSuccess = false;
  try {
    await runNonInteractive({
      dir: DATA_DIR,
      file: '',
      operation: 'collar',
      noBanner: true,
    });
    autoDetectedCollarSuccess = true;
  } catch {
    autoDetectedCollarSuccess = false;
  }
  assert('runner auto-detecta archivo de collar cuando file está vacío', autoDetectedCollarSuccess);

  // Test auto-detection in root using fallback to subfolder
  let rootFallbackSuccess = false;
  try {
    await runNonInteractive({
      dir: process.cwd(),
      file: '',
      operation: 'assay',
      noBanner: true,
    });
    rootFallbackSuccess = true;
  } catch {
    rootFallbackSuccess = false;
  }
  assert('runner auto-detecta archivo en subcarpeta (data_tests) cuando dir es cwd', rootFallbackSuccess);

  // ── RESUMEN ───────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(35));
  console.log(`  Passed : ${passed}`);
  console.log(`  Failed : ${failed}`);
  console.log('─'.repeat(35) + '\n');
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
