import path from 'path';
import fs from 'fs';
import { getFilesInDir } from './core/parser.js';
import { runCollar, printCollar } from './commands/collar.js';
import { runAssay, printAssay } from './commands/assay.js';
import { runLitho, printLitho } from './commands/litho.js';
import { runAudit, printAudit } from './commands/audit.js';
import { runSchema, printSchema } from './commands/schema.js';
import { exportData } from './commands/export.js';
import type { RunnerOptions } from './types/index.js';

const OP_LABELS: Record<string, string> = {
  audit: 'audit_report',
  collar: 'collar_limits',
  assay: 'assay_limits',
  litho: 'litho_values',
  schema: 'schema_report',
};

export async function runNonInteractive(opts: RunnerOptions): Promise<void> {
  const { dir, file, operation, format, outdir } = opts;

  // Validar directorio
  const resolvedDir = path.resolve(dir);
  if (!fs.existsSync(resolvedDir)) {
    console.error(`Error: El directorio no existe: ${dir}`);
    process.exit(1);
  }

  // Buscar archivo si no se especificó
  let targetFile = file;
  if (!targetFile) {
    const files = getFilesInDir(resolvedDir);
    if (files.length === 0) {
      console.error(`Error: No hay archivos .csv/.txt en: ${dir}`);
      process.exit(1);
    }
    targetFile = files[0] as string;
  }

  const filePath = path.join(resolvedDir, targetFile);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: Archivo no encontrado: ${targetFile} en ${dir}`);
    process.exit(1);
  }

  const baseOpts = { baseDir: resolvedDir, output: format };

  // Construir opciones específicas según operación
  let result: any;
  switch (operation) {
    case 'audit':
      result = await runAudit(filePath, { ...baseOpts });
      printAudit(result);
      break;

    case 'collar': {
      const buf = opts.buffer ?? '0';
      result = await runCollar(filePath, { ...baseOpts, buffer: buf });
      printCollar(result);
      break;
    }

    case 'assay': {
      const cols = opts.cols && opts.cols.length > 0 ? opts.cols : undefined;
      const classes = opts.classes ?? '6';
      result = await runAssay(filePath, { ...baseOpts, cols, classes });
      printAssay(result);
      break;
    }

    case 'litho': {
      const cols = opts.cols && opts.cols.length > 0 ? opts.cols : undefined;
      result = await runLitho(filePath, { ...baseOpts, cols });
      printLitho(result);
      break;
    }

    case 'schema':
      result = await runSchema(filePath, { ...baseOpts });
      printSchema(result);
      break;
  }

  // Exportar si se especificó formato
  if (format && result && operation !== 'audit' && operation !== 'schema') {
    const label = OP_LABELS[operation] ?? operation;
    const f = exportData(result, label, format, outdir);
    const files = Array.isArray(f) ? f : [f];
    console.log(`\nExportado:`);
    for (const file of files) {
      console.log(`  - ${file}`);
    }
  }
}
