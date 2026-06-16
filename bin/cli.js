#!/usr/bin/env node
import { select, multiselect, text, outro, spinner, isCancel, cancel } from '@clack/prompts';
import { getFilesInDir, parseFile } from '../src/parser.js';
import { printBanner } from '../src/banner.js';
import collarCmd  from '../src/commands/collar.js';
import assayCmd   from '../src/commands/assay.js';
import lithoCmd   from '../src/commands/litho.js';
import schemaCmd  from '../src/commands/schema.js';
import auditCmd   from '../src/commands/audit.js';

function checkCancel(val) {
  if (isCancel(val)) {
    cancel('Operación cancelada.');
    process.exit(0);
  }
  return val;
}

await printBanner();

// 1. Detecta archivos en la carpeta actual
const files = getFilesInDir(process.cwd());
if (!files.length) {
  cancel('No se encontraron archivos .txt o .csv en esta carpeta.');
  process.exit(1);
}

// 2. Operación
const operation = checkCancel(await select({
  message: 'Selecciona operación:',
  options: [
    { value: 'audit',  label: 'Audit File     — Validar columnas, nulos y decimales' },
    { value: 'collar', label: 'Collar Limits  — min/max de coordenadas' },
    { value: 'assay',  label: 'Assay Ranges   — min/max + rangos por percentil' },
    { value: 'litho',  label: 'Litho Values   — códigos únicos para leyenda' },
    { value: 'schema', label: 'Vulcan Types   — inferir tipos de datos (text, integer, single, double)' },
  ]
}));

// 3. Archivo
const file = checkCancel(await select({
  message: 'Selecciona archivo:',
  options: files.map(f => ({ value: f, label: f }))
}));

// 4. Formato exportación
const output = checkCancel(await select({
  message: 'Formato de exportación:',
  options: [
    { value: 'txt', label: 'TXT — bloque de notas' },
    { value: 'csv', label: 'CSV — Excel / Vulcan' },
  ]
}));

const opts = { output };

// 5. Opciones según operación
if (operation === 'collar') {
  const buf = checkCancel(await text({
    message: 'Valor fijo de buffer (0 = sin buffer):',
    defaultValue: '0',
    validate: v => isNaN(parseFloat(v)) ? 'Ingresa un número' : undefined
  }));
  opts.buffer = buf;
}

if (operation === 'assay') {
  const { headers } = parseFile(file);
  const selectedCols = checkCancel(await multiselect({
    message: 'Selecciona las columnas a analizar (Usa Espacio para seleccionar, Enter para confirmar):',
    options: headers.map(h => ({ value: h, label: h })),
    required: true
  }));

  const n = checkCancel(await text({
    message: 'Número de clases para rangos (ej: 6, 7):',
    defaultValue: '6',
    validate: v => (isNaN(parseInt(v)) || parseInt(v) < 2) ? 'Mínimo 2' : undefined
  }));
  opts.cols = selectedCols;
  opts.classes = n;
}

if (operation === 'litho') {
  const { headers } = parseFile(file);
  const lithoHeaders = headers.filter(h => !['HOLE_ID','FROM','TO'].includes(h));

  const col = checkCancel(await select({
    message: 'Columna a analizar:',
    options: lithoHeaders.map(h => ({ value: h, label: h }))
  }));
  const freq = checkCancel(await text({
    message: 'Frecuencia mínima (0 = todas):',
    defaultValue: '0',
    validate: v => isNaN(parseInt(v)) ? 'Ingresa un número' : undefined
  }));
  opts.col  = col;
  opts.freq = freq;
}

// 6. Ejecuta
const s = spinner();
s.start('Procesando...');

try {
  if (operation === 'audit')  auditCmd(file, opts);
  if (operation === 'collar') collarCmd(file, opts);
  if (operation === 'assay')  assayCmd(file, opts);
  if (operation === 'litho')  lithoCmd(file, opts);
  if (operation === 'schema') schemaCmd(file, opts);
  s.stop('Listo.');
} catch (err) {
  s.stop('Error.');
  console.error(`\n${err.message}`);
  process.exit(1);
}

outro('Proceso completado.');