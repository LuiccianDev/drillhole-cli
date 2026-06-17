import { parseColumns } from '../core/parser.js';
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
  const { columns, headers } = parseColumns(file);
  const buffer = parseFloat(opts.buffer ?? 0);

  // Mapeo flexible de columnas comunes
  const map = {
    EASTING:   ['EASTING', 'EAST', 'X', 'XCOLLAR'],
    NORTHING:  ['NORTHING', 'NORTH', 'Y', 'YCOLLAR'],
    ELEVATION: ['ELEVATION', 'ELEV', 'Z', 'ZCOLLAR'],
    LENGTH:    ['LENGTH', 'DEPTH', 'MAX_DEPTH', 'TD']
  };

  const findCol = (keys) => keys.find(k => headers.includes(k));

  const get = (keys) => {
    const col = findCol(keys);
    return col ? columns[col].map(v => parseFloat(v)).filter(v => !isNaN(v)) : [];
  };

  const eastVals  = get(map.EASTING);
  const northVals = get(map.NORTHING);
  const elevVals  = get(map.ELEVATION);
  const lenVals   = get(map.LENGTH);

  // Validación: si no hay datos en las coordenadas principales
  if (!eastVals.length || !northVals.length || !elevVals.length) {
    throw new Error('No se encontraron columnas de coordenadas válidas (X/Y/Z). Revisa los encabezados del archivo.');
  }

  // Identificar qué encabezados se usaron para el reporte
  const usedHeaders = {
    E: findCol(map.EASTING),
    N: findCol(map.NORTHING),
    Z: findCol(map.ELEVATION),
    L: findCol(map.LENGTH)
  };

  // EASTING — 6 dígitos → redondeo centena, buffer x100
  const easting  = calcLimits(eastVals,  100, buffer);

  // NORTHING — 7 dígitos → redondeo centena, buffer x100
  const northing = calcLimits(northVals, 100, buffer);

  // ELEVATION (Z):
  //   min_z = MIN(ELEVATION) - MAX(LENGTH)  → redondeo decena, buffer /10
  //   max_z = MAX(ELEVATION)                → redondeo decena, buffer /10
  
  // Si no hay LENGTH en el archivo, usamos externalMaxLen si existe
  let maxLen = lenVals.length > 0 ? Math.max(...lenVals) : 0;
  let source = usedHeaders.L || 'LENGTH column';

  if (opts.externalMaxLen !== undefined) {
    maxLen = parseFloat(opts.externalMaxLen);
    source = 'external source';
  }

  const minElev = Math.min(...elevVals);
  const maxElev = Math.max(...elevVals);
  const buf_z   = buffer / 10;

  const elevation = {
    raw_min:      minElev,
    raw_max:      maxElev,
    max_length:   maxLen,
    len_source:   source,
    min_boundary: floorTo(minElev - maxLen, 10) - buf_z,
    max_boundary: ceilTo(maxElev,           10) + buf_z,
  };

  // LENGTH — solo informativo, sin redondeo ni buffer
  const length = {
    raw_min: lenVals.length > 0 ? Math.min(...lenVals) : 0,
    raw_max: maxLen,
    source: source
  };

  return { 
    EASTING: easting, 
    NORTHING: northing, 
    ELEVATION: elevation, 
    LENGTH: length,
    _headers: usedHeaders 
  };
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
  console.log(`  max_length  : ${ELEVATION.max_length} (${ELEVATION.len_source})`);
  console.log(`  min_boundary: ${ELEVATION.min_boundary}  (MIN_ELEV - MAX_LENGTH, redondeo decena)`);
  console.log(`  max_boundary: ${ELEVATION.max_boundary}  (MAX_ELEV, redondeo decena)`);

  console.log('\nLENGTH (informativo):');
  console.log(`  min: ${LENGTH.raw_min}  max: ${LENGTH.raw_max} (${LENGTH.source})`);
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