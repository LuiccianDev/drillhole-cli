import { parseColumns } from '../parser.js';
import { exportData } from './export.js';

// Redondeo direccional
function floorTo(val, unit) { return Math.floor(val / unit) * unit; }
function ceilTo(val, unit)  { return Math.ceil(val  / unit) * unit; }

function calcLimits(vals, unit, bufferXY, isZ = false) {
  const raw_min = Math.min(...vals);
  const raw_max = Math.max(...vals);

  // Redondeo base
  const rounded_min = floorTo(raw_min, unit);
  const rounded_max = ceilTo(raw_max,  unit);

  // Buffer adaptado según coordenada
  const buf = isZ ? bufferXY / 10 : bufferXY;

  return {
    raw_min,
    raw_max,
    min_boundary: rounded_min - buf,
    max_boundary: rounded_max + buf,
  };
}

export function runCollar(file, opts = {}) {
  const { columns } = parseColumns(file);
  const buffer = parseFloat(opts.buffer ?? 0);

  // Valores por columna
  const get = (col) => columns[col]
    ? columns[col].map(v => parseFloat(v)).filter(v => !isNaN(v))
    : [];

  const eastVals  = get('EASTING');
  const northVals = get('NORTHING');
  const elevVals  = get('ELEVATION');
  const lenVals   = get('LENGTH');

  // EASTING — 6 dígitos → redondeo centena, buffer x100
  const easting  = calcLimits(eastVals,  100, buffer);

  // NORTHING — 7 dígitos → redondeo centena, buffer x100
  const northing = calcLimits(northVals, 100, buffer);

  // ELEVATION (Z):
  //   min_z = MIN(ELEVATION) - MAX(LENGTH)  → redondeo decena, buffer /10
  //   max_z = MAX(ELEVATION)                → redondeo decena, buffer /10
  const maxLen  = Math.max(...lenVals);
  const minElev = Math.min(...elevVals);
  const maxElev = Math.max(...elevVals);
  const buf_z   = buffer / 10;

  const elevation = {
    raw_min:      minElev,
    raw_max:      maxElev,
    max_length:   maxLen,
    min_boundary: floorTo(minElev - maxLen, 10) - buf_z,
    max_boundary: ceilTo(maxElev,           10) + buf_z,
  };

  // LENGTH — solo informativo, sin redondeo ni buffer
  const length = {
    raw_min: Math.min(...lenVals),
    raw_max: maxLen,
  };

  return { EASTING: easting, NORTHING: northing, ELEVATION: elevation, LENGTH: length };
}

export function printCollar(result) {
  console.log('\n=== COLLAR LIMITS ===');

  const { EASTING, NORTHING, ELEVATION, LENGTH } = result;

  console.log('\nEASTING:');
  console.log(`  raw         : [${EASTING.raw_min}, ${EASTING.raw_max}]`);
  console.log(`  min_boundary: ${EASTING.min_boundary}`);
  console.log(`  max_boundary: ${EASTING.max_boundary}`);

  console.log('\nNORTHING:');
  console.log(`  raw         : [${NORTHING.raw_min}, ${NORTHING.raw_max}]`);
  console.log(`  min_boundary: ${NORTHING.min_boundary}`);
  console.log(`  max_boundary: ${NORTHING.max_boundary}`);

  console.log('\nELEVATION (Z):');
  console.log(`  raw_elev    : [${ELEVATION.raw_min}, ${ELEVATION.raw_max}]`);
  console.log(`  max_length  : ${ELEVATION.max_length}`);
  console.log(`  min_boundary: ${ELEVATION.min_boundary}  (MIN_ELEV - MAX_LENGTH, redondeo decena)`);
  console.log(`  max_boundary: ${ELEVATION.max_boundary}  (MAX_ELEV, redondeo decena)`);

  console.log('\nLENGTH (informativo):');
  console.log(`  min: ${LENGTH.raw_min}  max: ${LENGTH.raw_max}`);
}

export default function collarCmd(file, opts) {
  const result = runCollar(file, opts);
  printCollar(result);
  if (opts.output) {
    const f = exportData(result, 'collar_limits', opts.output);
    console.log(`\nExportado: ${f}`);
  }
  return result;
}