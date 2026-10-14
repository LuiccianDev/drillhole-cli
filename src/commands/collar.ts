import { parseColumns } from '../core/parser.js';
import { exportData } from './export.js';
import type { CollarOptions, CollarResult, LimitResult, ElevationResult, BlockModelBounds } from '../types/index.js';
import { floorTo, ceilTo, getMin, getMax } from '../utils/math.js';
import { COLLAR_COLUMN_MAP } from '../constants/mining.js';

function calcLimits(vals: number[], unit: number, bufferXY: number, isZ = false): LimitResult {
  const raw_min = getMin(vals);
  const raw_max = getMax(vals);

  // Redondeo base
  const rounded_min = floorTo(raw_min, unit);
  const rounded_max = ceilTo(raw_max, unit);

  // Buffer adaptado según coordenada
  const buf = isZ ? bufferXY / 10 : bufferXY;

  return {
    raw_min,
    raw_max,
    min_boundary: rounded_min - buf,
    max_boundary: rounded_max + buf,
  };
}

export async function runCollar(file: string, opts: CollarOptions = {}): Promise<CollarResult> {
  const map = COLLAR_COLUMN_MAP;
  const targetCols = [...map.EASTING, ...map.NORTHING, ...map.ELEVATION, ...map.LENGTH];

  const { columns, headers } = await parseColumns(file, 0, targetCols, opts.baseDir);
  const buffer = typeof opts.buffer === 'string' ? parseFloat(opts.buffer) : (opts.buffer ?? 0);

  const findCol = (keys: readonly string[]) => keys.find((k) => headers.includes(k));

  const get = (keys: readonly string[]) => {
    const col = findCol(keys);
    return col ? (columns[col] ?? []).map((v) => parseFloat(v)).filter((v) => !isNaN(v)) : [];
  };

  const eastVals = get(map.EASTING);
  const northVals = get(map.NORTHING);
  const elevVals = get(map.ELEVATION);
  const lenVals = get(map.LENGTH);

  // Validación: si no hay datos en las coordenadas principales
  if (!eastVals.length || !northVals.length || !elevVals.length) {
    throw new Error(
      'No se encontraron columnas de coordenadas válidas (X/Y/Z). Revisa los encabezados del archivo.',
    );
  }

  // Identificar qué encabezados se usaron para el reporte
  const usedHeaders: Record<string, string | undefined> = {
    E: findCol(map.EASTING),
    N: findCol(map.NORTHING),
    Z: findCol(map.ELEVATION),
    L: findCol(map.LENGTH),
  };

  // EASTING — 6 dígitos → redondeo centena, buffer x100
  const easting = calcLimits(eastVals, 100, buffer);

  // NORTHING — 7 dígitos → redondeo centena, buffer x100
  const northing = calcLimits(northVals, 100, buffer);

  // ELEVATION (Z):
  //   min_z = MIN(ELEVATION) - MAX(LENGTH)  → redondeo decena, buffer /10
  //   max_z = MAX(ELEVATION)                → redondeo decena, buffer /10

  // Si no hay LENGTH en el archivo, usamos externalMaxLen si existe
  let maxLen = lenVals.length > 0 ? getMax(lenVals) : 0;
  let source = usedHeaders.L || 'LENGTH column';

  if (opts.externalMaxLen !== undefined) {
    maxLen =
      typeof opts.externalMaxLen === 'string'
        ? parseFloat(opts.externalMaxLen)
        : opts.externalMaxLen;
    source = 'external source';
  }

  const minElev = getMin(elevVals);
  const maxElev = getMax(elevVals);
  const buf_z = buffer / 10;

  const elevation: ElevationResult = {
    raw_min: minElev,
    raw_max: maxElev,
    max_length: maxLen,
    len_source: source,
    min_boundary: floorTo(minElev - maxLen, 10) - buf_z,
    max_boundary: ceilTo(maxElev, 10) + buf_z,
  };

  // LENGTH — solo informativo, sin redondeo ni buffer
  const length = {
    raw_min: lenVals.length > 0 ? getMin(lenVals) : 0,
    raw_max: maxLen,
    source: source,
  };

  // Cálculo de parámetros de modelo de bloques para Maptek Vulcan (.bdf)
  const dx = +(easting.max_boundary - easting.min_boundary).toFixed(2);
  const dy = +(northing.max_boundary - northing.min_boundary).toFixed(2);
  const dz = +(elevation.max_boundary - elevation.min_boundary).toFixed(2);

  const blockModel: BlockModelBounds = {
    origin: {
      x: easting.min_boundary,
      y: northing.min_boundary,
      z: elevation.min_boundary,
    },
    extents: { dx, dy, dz },
    centroid: {
      x: +(easting.min_boundary + dx / 2).toFixed(2),
      y: +(northing.min_boundary + dy / 2).toFixed(2),
      z: +(elevation.min_boundary + dz / 2).toFixed(2),
    },
  };

  return {
    EASTING: easting,
    NORTHING: northing,
    ELEVATION: elevation,
    LENGTH: length,
    _headers: usedHeaders,
    blockModel,
  };
}

export function printCollar(result: CollarResult): void {
  console.log('\n=== COLLAR LIMITS & SPATIAL EXTENTS ===');

  const { EASTING, NORTHING, ELEVATION, LENGTH, blockModel } = result;

  console.log('\nEASTING (X):');
  console.log(`  raw         : [${EASTING.raw_min}, ${EASTING.raw_max}]`);
  console.log(`  min_boundary: ${EASTING.min_boundary}`);
  console.log(`  max_boundary: ${EASTING.max_boundary}`);

  console.log('\nNORTHING (Y):');
  console.log(`  raw         : [${NORTHING.raw_min}, ${NORTHING.raw_max}]`);
  console.log(`  min_boundary: ${NORTHING.min_boundary}`);
  console.log(`  max_boundary: ${NORTHING.max_boundary}`);

  console.log('\nELEVATION (Z):');
  console.log(`  raw_elev    : [${ELEVATION.raw_min}, ${ELEVATION.raw_max}]`);
  console.log(`  max_length  : ${ELEVATION.max_length} (${ELEVATION.len_source})`);
  console.log(
    `  min_boundary: ${ELEVATION.min_boundary}  (MIN_ELEV - MAX_LENGTH, redondeo decena)`,
  );
  console.log(`  max_boundary: ${ELEVATION.max_boundary}  (MAX_ELEV, redondeo decena)`);

  console.log('\nLENGTH (informativo):');
  console.log(`  min: ${LENGTH.raw_min}  max: ${LENGTH.raw_max} (${LENGTH.source})`);

  if (blockModel) {
    console.log('\n=== VULCAN BLOCK MODEL FRAMEWORK (.bdf) ===');
    console.log(
      `  Origin (X, Y, Z)   : (${blockModel.origin.x}, ${blockModel.origin.y}, ${blockModel.origin.z})`,
    );
    console.log(
      `  Extents (DX, DY, DZ): ${blockModel.extents.dx}m x ${blockModel.extents.dy}m x ${blockModel.extents.dz}m`,
    );
    console.log(
      `  Centroid (Xc, Yc, Zc): (${blockModel.centroid.x}, ${blockModel.centroid.y}, ${blockModel.centroid.z})`,
    );
  }
}

export default async function collarCmd(file: string, opts: CollarOptions) {
  const result = await runCollar(file, opts);
  printCollar(result);
  if (opts.output) {
    const f = exportData(result, 'collar_limits', opts.output as 'csv' | 'txt');
    console.log(`\nExportado: ${f}`);
  }
  return result;
}
