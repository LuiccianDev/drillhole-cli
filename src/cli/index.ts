import { select, multiselect, text, outro, spinner, isCancel, cancel } from '@clack/prompts';
import { getFilesInDir, parseFile, parseColumns } from '../core/parser.js';
import { printBanner } from './banner.js';
import collarCmd from '../commands/collar.js';
import assayCmd from '../commands/assay.js';
import lithoCmd from '../commands/litho.js';
import schemaCmd from '../commands/schema.js';
import auditCmd from '../commands/audit.js';

import type {
  AssayOptions,
  CollarOptions,
  LithoOptions,
  CliGlobalOptions,
} from '../types/index.js';

type Operation = 'audit' | 'collar' | 'assay' | 'litho' | 'schema';

interface CliOptions extends AssayOptions, CollarOptions, LithoOptions {}

function checkCancel<T>(val: T | symbol): T {
  if (isCancel(val)) {
    cancel('Operación cancelada.');
    process.exit(0);
  }
  return val as T;
}

export async function runCli(baseDir: string, globalOpts: CliGlobalOptions = {}) {
  if (!globalOpts.noBanner) {
    await printBanner();
  }

  // 1. Detecta archivos en la carpeta indicada
  const files = getFilesInDir(baseDir);
  if (!files.length) {
    cancel(`No se encontraron archivos .txt o .csv en la carpeta: ${baseDir}`);
    process.exit(1);
  }

  // 2. Operación
  const operation = checkCancel(
    await select({
      message: 'Selecciona operación:',
      options: [
        { value: 'audit', label: 'Audit File     — Validar columnas, nulos y decimales' },
        { value: 'collar', label: 'Collar Limits  — min/max de coordenadas' },
        { value: 'assay', label: 'Assay Ranges   — min/max + rangos por percentil' },
        { value: 'litho', label: 'Litho Values   — códigos únicos para leyenda' },
        {
          value: 'schema',
          label: 'Vulcan Types   — inferir tipos de datos (text, integer, single, double)',
        },
      ],
    }),
  ) as Operation;

  // 3. Archivo
  const file = checkCancel(
    await select({
      message: 'Selecciona archivo:',
      options: files.map((f) => ({ value: f, label: f })),
    }),
  ) as string;

  const filePath = `${baseDir}/${file}`;

  // 4. Formato exportación
  let output: string | undefined;
  if (operation !== 'audit' && operation !== 'schema') {
    output = checkCancel(
      await select({
        message: 'Formato de exportación:',
        options: [
          { value: 'txt', label: 'TXT — bloque de notas' },
          { value: 'csv', label: 'CSV — Excel / Vulcan' },
          { value: 'none', label: 'No exportar — solo mostrar en pantalla' },
        ],
      }),
    ) as string;
    if (output === 'none') output = undefined;
  }

  const opts: CliOptions = { output, baseDir };

  // 5. Opciones según operación
  if (operation === 'collar') {
    const buf = checkCancel(
      await text({
        message: 'Valor fijo de buffer (0 = sin buffer):',
        defaultValue: '0',
        validate: (v) => (isNaN(parseFloat(v)) ? 'Ingresa un número' : undefined),
      }),
    ) as string;
    opts.buffer = buf;

    // Verificar si tiene columna LENGTH
    const { headers } = await parseFile(filePath);
    if (!headers.includes('LENGTH')) {
      const useExternal = checkCancel(
        await select({
          message:
            'Columna LENGTH no encontrada. ¿Deseas usar otro archivo para la profundidad máxima?',
          options: [
            { value: true, label: 'Sí, seleccionar archivo y columna' },
            { value: false, label: 'No, usar 0 (Z min = Elev min)' },
          ],
        }),
      ) as boolean;

      if (useExternal) {
        const extFile = checkCancel(
          await select({
            message: 'Selecciona archivo para profundidad:',
            options: files.map((f) => ({ value: f, label: f })),
          }),
        ) as string;

        const { headers: extHeaders, columns: extCols } = await parseColumns(
          `${baseDir}/${extFile}`,
        );
        const extCol = checkCancel(
          await select({
            message: 'Selecciona columna de profundidad:',
            options: extHeaders.map((h) => ({ value: h, label: h })),
          }),
        ) as string;

        const vals = (extCols[extCol] ?? []).map((v) => parseFloat(v)).filter((v) => !isNaN(v));
        if (vals.length > 0) {
          opts.externalMaxLen = Math.max(...vals);
        }
      }
    }
  }

  if (operation === 'assay') {
    const { headers } = await parseFile(filePath);
    const selectedCols = checkCancel(
      await multiselect({
        message:
          'Selecciona las columnas a analizar (Usa Espacio para seleccionar, Enter para confirmar):',
        options: headers.map((h) => ({ value: h, label: h })),
        required: true,
      }),
    ) as string[];

    const n = checkCancel(
      await text({
        message: 'Número de clases para rangos (ej: 6, 7):',
        defaultValue: '6',
        validate: (v) => (isNaN(parseInt(v)) || parseInt(v) < 2 ? 'Mínimo 2' : undefined),
      }),
    ) as string;
    opts.cols = selectedCols;
    opts.classes = n;
  }

  if (operation === 'litho') {
    const { headers } = await parseFile(filePath);
    const lithoHeaders = headers.filter(
      (h) => !['BHID', 'HOLE_ID', 'FROM', 'TO', 'LENGTH', 'X', 'Y', 'Z'].includes(h.toUpperCase()),
    );

    const selectedCols = checkCancel(
      await multiselect({
        message:
          'Selecciona las columnas a analizar (Usa Espacio/Tab para seleccionar, Enter para confirmar):',
        options: lithoHeaders.map((h) => ({ value: h, label: h })),
        required: true,
      }),
    ) as string[];
    opts.cols = selectedCols;
  }

  // 6. Ejecuta
  const s = spinner();
  s.start('Procesando...');

  try {
    if (operation === 'audit') await auditCmd(filePath, opts);
    else if (operation === 'collar') await collarCmd(filePath, opts);
    else if (operation === 'assay') await assayCmd(filePath, opts);
    else if (operation === 'litho') await lithoCmd(filePath, opts);
    else if (operation === 'schema') await schemaCmd(filePath, opts);
    s.stop('Listo.');
    await new Promise((resolve) => setTimeout(resolve, 300));
  } catch (err: any) {
    s.stop('Error.');
    console.error(`\n${err.message}`);
    process.exit(1);
  }

  outro('Proceso completado.');
}
