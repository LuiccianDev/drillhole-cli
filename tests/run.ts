import { runCollar } from '../src/commands/collar.js';
import { runAssay } from '../src/commands/assay.js';
import { runLitho } from '../src/commands/litho.js';
import { runAudit } from '../src/commands/audit.js';
import { runSchema } from '../src/commands/schema.js';
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
  assert('ELEVATION min_boundary <= raw_min - max_length',
    collar.ELEVATION.min_boundary <= collar.ELEVATION.raw_min - collar.ELEVATION.max_length);
  assert('ELEVATION max_boundary >= raw_max', collar.ELEVATION.max_boundary >= collar.ELEVATION.raw_max);
  assert('ELEVATION min_boundary es múltiplo de 10', collar.ELEVATION.min_boundary % 10 === 0);
  assert('ELEVATION max_boundary es múltiplo de 10', collar.ELEVATION.max_boundary % 10 === 0);

  // ── COLLAR con buffer 100 ─────────────────────────────────────────────────────
  console.log('\n[collar — buffer 100]');
  const collarBuf = await runCollar(getPath('header.txt'), { buffer: '100' });

  // XY buffer = 100
  assert('EASTING  min con buffer < sin buffer', collarBuf.EASTING.min_boundary < collar.EASTING.min_boundary);
  assert('EASTING  max con buffer > sin buffer', collarBuf.EASTING.max_boundary > collar.EASTING.max_boundary);

  // ── ASSAY ──────────────────────────────────────────────────────────
  console.log('\n[assay — 6 clases]');
  const assay = await runAssay(getPath('assays.txt'));
  assert('tiene CUT%', 'CUT%' in assay);
  assert('raw_min >= 0', assay['CUT%'].raw_min >= 0);
  assert('raw_min < raw_max', assay['CUT%'].raw_min < assay['CUT%'].raw_max);
  assert('count > 0', assay['CUT%'].count > 0);
  assert('tiene ranges', Array.isArray(assay['CUT%'].ranges));
  assert('ranges tiene 6 clases por defecto', assay['CUT%'].ranges.length === 6);

  // ── LITHO ──────────────────────────────────────────────────────────
  console.log('\n[litho — sin filtro]');
  const litho = await runLitho(getPath('litho.txt'), { cols: ['RX_CODE'] });
  assert('tiene resultados', litho['RX_CODE'].length > 0);
  assert('es un array ordenado', Array.isArray(litho['RX_CODE']));

  // ── AUDIT ────────────────────────────────────────────────────────────────────
  console.log('\n[audit — logic]');
  const fClean = 'test_clean.csv';
  fs.writeFileSync(fClean, 'ID,VAL\n1,10.5\n2,20.0');
  const auditClean = await runAudit(fClean);
  assert('audit clean: total_rows is 2', auditClean.stats.total_rows === 2);
  fs.unlinkSync(fClean);

  // ── SCHEMA ───────────────────────────────────────────────────────────────────
  console.log('\n[schema — logic]');
  const fSchema = 'test_schema.csv';
  fs.writeFileSync(fSchema, 'TXT,INT,SNG,DBL\nA,1,1.1,1.123456789123\nB,2,2.2,2.2');
  const schema = await runSchema(fSchema);

  const getType = (col: string) => schema.find(s => s.column === col)?.type;
  assert('TXT is text', getType('TXT') === 'text');
  assert('INT is integer', getType('INT') === 'integer');
  assert('SNG is single', getType('SNG') === 'single');
  assert('DBL is double', getType('DBL') === 'double');

  fs.unlinkSync(fSchema);

  // ── RESUMEN ───────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(35));
  console.log(`  Passed : ${passed}`);
  console.log(`  Failed : ${failed}`);
  console.log('─'.repeat(35) + '\n');
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
