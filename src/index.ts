#!/usr/bin/env node
import { runCli } from './cli/index.js';
import { runNonInteractive } from './runner.js';
import type { RunnerOptions } from './types/index.js';

const args = process.argv.slice(2);

// Help
if (args.includes('--help') || args.includes('-h')) {
  console.log('Uso: pnpm drill [opciones]\n');
  console.log('Opciones generales:');
  console.log('  --dir, -d <ruta>     Ruta a la carpeta con archivos .csv/.txt');
  console.log('  --file <archivo>     Archivo específico a procesar');
  console.log('  --no-banner, -q      Sin animación de banner');
  console.log('  --format <csv|txt>   Formato de exportación');
  console.log('  --outdir <ruta>      Carpeta de salida para exportaciones');
  console.log('  --help, -h           Muestra este mensaje de ayuda');
  console.log('  --version, -v        Muestra la versión\n');
  console.log('Operaciones (usar solo una):');
  console.log('  --audit              Validar columnas, nulos y decimales');
  console.log('  --collar             Calcular límites de coordenadas');
  console.log('  --assay              Rangos por percentil');
  console.log('  --litho              Códigos únicos para leyenda');
  console.log('  --schema             Inferir tipos de datos Vulcan\n');
  console.log('Opciones específicas:');
  console.log('  --buffer <num>       Buffer para collar (default: 0)');
  console.log('  --classes <num>      Número de clases para assay (default: 6)');
  console.log('  --cols <c1,c2,...>   Columnas a analizar (separadas por coma)\n');
  console.log('Ejemplos:');
  console.log('  pnpm drill --collar --dir ./data --file collar.csv --buffer 50 --format csv');
  console.log('  pnpm drill --assay --dir ./data --file assays.txt --cols "CUT%,FE" --classes 8');
  console.log('  pnpm drill --audit --dir ./data --file data.csv');
  process.exit(0);
}

// Version
if (args.includes('--version') || args.includes('-v')) {
  const { readFileSync } = await import('fs');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
  console.log(`${pkg.name} v${pkg.version}`);
  process.exit(0);
}

// Silent / no-banner
const noBanner = args.includes('--no-banner') || args.includes('-q');

// Directorio base
let dir = process.cwd();
const dirIndex = args.findIndex((a) => a === '--dir' || a === '-d');
if (dirIndex !== -1) {
  const val = args[dirIndex + 1];
  if (val) dir = val;
}

// Detectar operación
const OPERATIONS = ['--audit', '--collar', '--assay', '--litho', '--schema'] as const;
const OP_MAP: Record<string, RunnerOptions['operation']> = {
  '--audit': 'audit',
  '--collar': 'collar',
  '--assay': 'assay',
  '--litho': 'litho',
  '--schema': 'schema',
};

const activeOpFlag = OPERATIONS.find((op) => args.includes(op));

if (!activeOpFlag) {
  // ── MODO INTERACTIVO ──
  await runCli(dir, { noBanner }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  // ── MODO NO-INTERACTIVO ──
  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    if (idx === -1) return undefined;
    const val = args[idx + 1];
    if (!val || val.startsWith('-')) return undefined;
    return val;
  };

  const file = getArg('--file');
  const format = getArg('--format') as 'csv' | 'txt' | undefined;
  const buffer = getArg('--buffer');
  const classes = getArg('--classes');
  const outdir = getArg('--outdir');
  const colsRaw = getArg('--cols');
  const cols = colsRaw
    ? colsRaw
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
    : undefined;

  if (format && format !== 'csv' && format !== 'txt') {
    console.error('Error: --format debe ser "csv" o "txt"');
    process.exit(1);
  }

  const operation = OP_MAP[activeOpFlag]!;

  const runnerOpts: RunnerOptions = {
    dir,
    operation,
    file: file ?? '',
    noBanner,
    format,
    outdir,
    buffer,
    classes,
    cols,
  };

  await runNonInteractive(runnerOpts).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
