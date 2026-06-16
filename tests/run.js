import { runCollar }  from '../src/commands/collar.js';
import { runAssay }   from '../src/commands/assay.js';
import { runLitho }   from '../src/commands/litho.js';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✔ ${label}`);
    passed++;
  } else {
    console.error(`  ✘ ${label}`);
    failed++;
  }
}

// ── COLLAR sin buffer ─────────────────────────────────────────────────────────
console.log('\n[collar — sin buffer]');
const collar = runCollar('header.txt');

// Estructura
assert('tiene EASTING',   'EASTING'   in collar);
assert('tiene NORTHING',  'NORTHING'  in collar);
assert('tiene ELEVATION', 'ELEVATION' in collar);
assert('tiene LENGTH',    'LENGTH'    in collar);

// EASTING redondeo centena
assert('EASTING min_boundary es múltiplo de 100', collar.EASTING.min_boundary % 100 === 0);
assert('EASTING max_boundary es múltiplo de 100', collar.EASTING.max_boundary % 100 === 0);
assert('EASTING min_boundary <= raw_min',         collar.EASTING.min_boundary <= collar.EASTING.raw_min);
assert('EASTING max_boundary >= raw_max',         collar.EASTING.max_boundary >= collar.EASTING.raw_max);

// NORTHING redondeo centena
assert('NORTHING min_boundary es múltiplo de 100', collar.NORTHING.min_boundary % 100 === 0);
assert('NORTHING max_boundary es múltiplo de 100', collar.NORTHING.max_boundary % 100 === 0);
assert('NORTHING min_boundary <= raw_min',         collar.NORTHING.min_boundary <= collar.NORTHING.raw_min);
assert('NORTHING max_boundary >= raw_max',         collar.NORTHING.max_boundary >= collar.NORTHING.raw_max);

// ELEVATION lógica Z
assert('ELEVATION tiene max_length',               'max_length' in collar.ELEVATION);
assert('ELEVATION min_boundary <= raw_min - max_length',
  collar.ELEVATION.min_boundary <= collar.ELEVATION.raw_min - collar.ELEVATION.max_length);
assert('ELEVATION max_boundary >= raw_max',        collar.ELEVATION.max_boundary >= collar.ELEVATION.raw_max);
assert('ELEVATION min_boundary es múltiplo de 10', collar.ELEVATION.min_boundary % 10 === 0);
assert('ELEVATION max_boundary es múltiplo de 10', collar.ELEVATION.max_boundary % 10 === 0);

// LENGTH solo informativo
assert('LENGTH tiene raw_min', 'raw_min' in collar.LENGTH);
assert('LENGTH tiene raw_max', 'raw_max' in collar.LENGTH);
assert('LENGTH no tiene min_boundary', !('min_boundary' in collar.LENGTH));

// ── COLLAR con buffer 100 ─────────────────────────────────────────────────────
console.log('\n[collar — buffer 100]');
const collarBuf = runCollar('header.txt', { buffer: '100' });

// XY buffer = 100
assert('EASTING  min con buffer < sin buffer', collarBuf.EASTING.min_boundary  < collar.EASTING.min_boundary);
assert('EASTING  max con buffer > sin buffer', collarBuf.EASTING.max_boundary  > collar.EASTING.max_boundary);
assert('NORTHING min con buffer < sin buffer', collarBuf.NORTHING.min_boundary < collar.NORTHING.min_boundary);
assert('NORTHING max con buffer > sin buffer', collarBuf.NORTHING.max_boundary > collar.NORTHING.max_boundary);

// Z buffer = 100/10 = 10
assert('ELEVATION min con buffer < sin buffer', collarBuf.ELEVATION.min_boundary < collar.ELEVATION.min_boundary);
assert('ELEVATION max con buffer > sin buffer', collarBuf.ELEVATION.max_boundary > collar.ELEVATION.max_boundary);
assert('diferencia Z buffer = 10', collar.ELEVATION.min_boundary - collarBuf.ELEVATION.min_boundary === 10);
assert('diferencia XY buffer = 100', collar.EASTING.min_boundary - collarBuf.EASTING.min_boundary === 100);

// ── ASSAY ──────────────────────────────────────────────────────────
console.log('\n[assay — 6 clases]');
const assay = runAssay('assays.txt');
assert('tiene CUT%',                           'CUT%' in assay);
assert('raw_min >= 0',                         assay['CUT%'].raw_min >= 0);
assert('raw_min < raw_max',                    assay['CUT%'].raw_min < assay['CUT%'].raw_max);
assert('count > 0',                            assay['CUT%'].count > 0);
assert('tiene ranges',                         Array.isArray(assay['CUT%'].ranges));
assert('ranges tiene 6 clases por defecto',    assay['CUT%'].ranges.length === 6);

// ── ASSAY ranges estructura ───────────────────────────────────────────────────
console.log('\n[assay — estructura de ranges]');
const r = assay['CUT%'].ranges[0];
assert('range tiene clase',           'clase'          in r);
assert('range tiene from',            'from'           in r);
assert('range tiene to',              'to'             in r);
assert('range tiene percentil_from',  'percentil_from' in r);
assert('range tiene percentil_to',    'percentil_to'   in r);
assert('primera clase from <= to',    r.from <= r.to);
assert('primera clase percentil_from === 0', r.percentil_from === 0);

// ── ASSAY ranges continuidad ──────────────────────────────────────────────────
console.log('\n[assay — continuidad de ranges]');
const ranges = assay['CUT%'].ranges;
for (let i = 0; i < ranges.length - 1; i++) {
  assert(
    `clase ${i + 1} to === clase ${i + 2} from`,
    ranges[i].to === ranges[i + 1].from
  );
}
assert('última clase to === raw_max', ranges[ranges.length - 1].to === assay['CUT%'].raw_max);

// ── ASSAY con 7 clases ────────────────────────────────────────────────────────
console.log('\n[assay — 7 clases]');
const assay7 = runAssay('assays.txt', { classes: '7' });
assert('ranges tiene 7 clases', assay7['CUT%'].ranges.length === 7);
assert('percentil_to última clase === 100', assay7['CUT%'].ranges[6].percentil_to === 100);



// ── ASSAY no incluye columnas skip ────────────────────────────────────────────
console.log('\n[assay — columnas skip]');
assert('no tiene HOLE_ID', !('HOLE_ID' in assay));
assert('no tiene FROM',    !('FROM'    in assay));
assert('no tiene TO',      !('TO'      in assay));

// ── LITHO sin filtro ──────────────────────────────────────────────────────────
console.log('\n[litho — sin filtro]');
const litho = runLitho('litho.txt', { col: 'RX_CODE', freq: '0' });
assert('tiene resultados',        Object.keys(litho).length > 0);
assert('no incluye NS',           !('NS' in litho));
assert('frequency es número',     typeof Object.values(litho)[0].frequency === 'number');
assert('frequency > 0',           Object.values(litho)[0].frequency > 0);

// ── LITHO con frecuencia mínima ───────────────────────────────────────────────
console.log('\n[litho — freq >= 6]');
const lithoFreq = runLitho('litho.txt', { col: 'RX_CODE', freq: '6' });
assert('tiene resultados',        Object.keys(lithoFreq).length > 0);
assert('todos tienen freq >= 6',  Object.values(lithoFreq).every(v => v.frequency >= 6));

// ── LITHO otras columnas ──────────────────────────────────────────────────────
console.log('\n[litho — SIMPL_CODE]');
const lithoSimpl = runLitho('litho.txt', { col: 'SIMPL_CODE', freq: '0' });
assert('tiene resultados SIMPL_CODE', Object.keys(lithoSimpl).length > 0);

console.log('\n[litho — ALT_CODE]');
const lithoAlt = runLitho('litho.txt', { col: 'ALT_CODE', freq: '0' });
assert('tiene resultados ALT_CODE',   Object.keys(lithoAlt).length > 0);

// ── LITHO columna inválida ────────────────────────────────────────────────────
console.log('\n[litho — columna inválida]');
try {
  runLitho('litho.txt', { col: 'COLUMNA_FALSA' });
  assert('debe lanzar error', false);
} catch (e) {
  assert('lanza error por columna inválida', e.message.includes('no existe'));
}

// ── RESUMEN ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(35));
console.log(`  Passed : ${passed}`);
console.log(`  Failed : ${failed}`);
console.log('─'.repeat(35) + '\n');
if (failed > 0) process.exit(1);