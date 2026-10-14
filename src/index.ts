#!/usr/bin/env node
import path from 'path';
import fs from 'fs';
import { runCli } from './cli/index.js';
import { runNonInteractive } from './runner.js';
import type { RunnerOptions } from './types/index.js';

const VALID_OPERATIONS = ['audit', 'collar', 'assay', 'litho', 'schema'] as const;
type OperationType = (typeof VALID_OPERATIONS)[number];

const OP_ALIASES: Record<string, OperationType> = {
  audit: 'audit',
  '--audit': 'audit',
  collar: 'collar',
  '--collar': 'collar',
  assay: 'assay',
  '--assay': 'assay',
  litho: 'litho',
  '--litho': 'litho',
  schema: 'schema',
  '--schema': 'schema',
};

function getLevenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] = 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
      }
    }
  }
  return dp[m]![n]!;
}

function suggestCommand(input: string, candidates: readonly string[]): string | undefined {
  let closest: string | undefined;
  let minDistance = Infinity;

  for (const cand of candidates) {
    const dist = getLevenshteinDistance(input.toLowerCase(), cand.toLowerCase());
    if (dist < minDistance && dist <= 2) {
      minDistance = dist;
      closest = cand;
    }
  }

  return closest;
}

const args = process.argv.slice(2);

// Help
if (args.includes('--help') || args.includes('-h')) {
  console.log('Uso: drill [comando] [ruta/archivo] [opciones]\n');
  console.log('Comandos:');
  console.log(
    '  audit [archivo]       Validar integridad geológica (solapamientos, gaps, coordenadas)',
  );
  console.log('  collar [archivo]      Calcular límites espaciales y marco Vulcan BDF');
  console.log(
    '  assay [archivo]       Estadísticas descriptivas (μ, σ, CV) y rangos por percentil',
  );
  console.log('  litho [archivo]       Leyenda litológica con frecuencias y porcentajes');
  console.log('  schema [archivo]      Inferir tipos de datos para bases de datos Vulcan\n');
  console.log('Opciones:');
  console.log('  -b, --buffer <num>    Buffer espacial para collar (default: 0)');
  console.log('  -c, --classes <num>   Número de clases para assay (default: 6)');
  console.log('  -f, --format <csv|txt> Formato de exportación (guarda en ./exports/)');
  console.log('  -o, --outdir <ruta>   Carpeta de salida personalizada para exportaciones');
  console.log('  -d, --dir <ruta>      Directorio base alternativo');
  console.log('  --file <archivo>      Nombre específico de archivo (opcional si se pasa ruta)');
  console.log('  --cols <c1,c2,...>    Columnas específicas a analizar (separadas por coma)');
  console.log('  -q, --no-banner       Suprimir animación inicial');
  console.log('  -h, --help            Muestra este mensaje de ayuda');
  console.log('  -v, --version         Muestra la versión instalada\n');
  console.log('Ejemplos rápidos:');
  console.log('  drill collar ./data/collar.csv -b 50 -f csv');
  console.log('  drill assay ./data/assays.txt -c 8');
  console.log('  drill audit ./data/assays.txt -f csv');
  console.log('  drill collar          (auto-detecta archivo de collar en la carpeta)');
  process.exit(0);
}

// Version
if (args.includes('--version') || args.includes('-v')) {
  const { readFileSync } = await import('fs');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
  console.log(`${pkg.name} v${pkg.version}`);
  process.exit(0);
}

// Helper para extraer valores de banderas cortas o largas
const getFlagVal = (flags: string[]): string | undefined => {
  for (const flag of flags) {
    const idx = args.indexOf(flag);
    if (idx !== -1) {
      const val = args[idx + 1];
      if (val && !val.startsWith('-')) return val;
    }
  }
  return undefined;
};

const hasFlag = (flags: string[]): boolean => flags.some((f) => args.includes(f));

const noBanner = hasFlag(['--no-banner', '-q']);

// Extraer flags conocidos para identificar argumentos posicionales libres
const flagsWithValues = [
  '--dir',
  '-d',
  '--file',
  '--format',
  '-f',
  '--buffer',
  '-b',
  '--classes',
  '-c',
  '--outdir',
  '-o',
  '--cols',
];
const flagValueIndices = new Set<number>();

for (let i = 0; i < args.length; i++) {
  const arg = args[i]!;
  if (flagsWithValues.includes(arg) && i + 1 < args.length) {
    flagValueIndices.add(i + 1);
  }
}

// Argumentos posicionales libres (que no son flags ni valores de flags)
const positionalArgs: string[] = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i]!;
  if (!arg.startsWith('-') && !flagValueIndices.has(i)) {
    positionalArgs.push(arg);
  }
}

// Detectar operación (puede venir como subcomando posicional o como flag)
let detectedOperation: OperationType | undefined;
let positionalPath: string | undefined;

// 1. Revisar si el primer argumento posicional es una operación válida
if (positionalArgs.length > 0) {
  const firstPos = positionalArgs[0]!.toLowerCase();
  if (VALID_OPERATIONS.includes(firstPos as OperationType)) {
    detectedOperation = firstPos as OperationType;
    positionalPath = positionalArgs[1];
  } else if (!hasFlag(['--audit', '--collar', '--assay', '--litho', '--schema'])) {
    // Si no es operación válida y no hay flags de operación, verificar si es typo
    const suggestion = suggestCommand(firstPos, VALID_OPERATIONS);
    if (suggestion) {
      console.error(
        `Error: Comando desconocido '${positionalArgs[0]}'. ¿Quisiste decir '${suggestion}'?`,
      );
      console.log('Ejecuta "drill --help" para ver la lista de comandos disponibles.');
      process.exit(1);
    }
    // Si es un archivo existente o ruta, puede ser el path para modo interactivo o auditoría
    positionalPath = positionalArgs[0];
  }
}

// 2. Si no vino como subcomando, buscar en flags clásicos (--collar, --assay, etc.)
if (!detectedOperation) {
  for (const [key, op] of Object.entries(OP_ALIASES)) {
    if (args.includes(key)) {
      detectedOperation = op;
      if (!positionalPath && positionalArgs.length > 0) {
        positionalPath = positionalArgs[0];
      }
      break;
    }
  }
}

// Extraer opciones adicionales
const format = getFlagVal(['--format', '-f']) as 'csv' | 'txt' | undefined;
const buffer = getFlagVal(['--buffer', '-b']);
const classes = getFlagVal(['--classes', '-c']);
const outdir = getFlagVal(['--outdir', '-o']);
const explicitFile = getFlagVal(['--file']);
const explicitDir = getFlagVal(['--dir', '-d']);
const colsRaw = getFlagVal(['--cols']);
const cols = colsRaw
  ? colsRaw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
  : undefined;

if (format && format !== 'csv' && format !== 'txt') {
  console.error('Error: -f / --format debe ser "csv" o "txt"');
  process.exit(1);
}

// ── RESOLUCIÓN DINÁMICA DE DIRECTORIO Y ARCHIVO ──
let dir = explicitDir ? path.resolve(explicitDir) : process.cwd();
let file = explicitFile ?? '';

if (positionalPath) {
  const resolvedPos = path.resolve(positionalPath);
  if (fs.existsSync(resolvedPos)) {
    const stat = fs.statSync(resolvedPos);
    if (stat.isDirectory()) {
      dir = resolvedPos;
    } else {
      dir = path.dirname(resolvedPos);
      file = path.basename(resolvedPos);
    }
  } else {
    // Si la ruta contiene separadores de directorio, desglosar
    if (positionalPath.includes('/') || positionalPath.includes('\\')) {
      dir = path.dirname(resolvedPos);
      file = path.basename(resolvedPos);
    } else {
      file = positionalPath;
    }
  }
}

if (!detectedOperation) {
  // ── MODO INTERACTIVO ASISTIDO ──
  await runCli(dir, { noBanner }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  // ── MODO NO-INTERACTIVO DINÁMICO ──
  const runnerOpts: RunnerOptions = {
    dir,
    operation: detectedOperation,
    file,
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
