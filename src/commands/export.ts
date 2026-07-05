import fs from 'fs';
import path from 'path';
import type { AssayResult, CollarResult, LithoResult, Range } from '../types/commands.js';

type ExportData = CollarResult | AssayResult | LithoResult;

export type { ExportData };

export function exportData(
  data: ExportData,
  name: string,
  format: 'txt' | 'csv' = 'txt',
  outdir?: string,
): string | string[] {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.resolve(outdir ?? path.join(process.cwd(), 'exports'));

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  if (name === 'assay_limits' && format === 'csv') {
    const files: string[] = [];
    const assayData = data as AssayResult;
    for (const [col, v] of Object.entries(assayData)) {
      const filename = `${name}_${col}_${timestamp}.csv`;
      const filepath = path.join(dir, filename);
      const content = [
        'Clase,From,To,Percentil_From,Percentil_To',
        ...v.ranges.map(
          (r: Range) => `${r.clase},${r.from},${r.to},${r.percentil_from},${r.percentil_to}`,
        ),
      ].join('\n');
      fs.writeFileSync(filepath, content);
      files.push(filepath);
    }
    return files;
  }

  const filename = `${name}_${timestamp}.${format}`;
  const filepath = path.join(dir, filename);

  let content = '';
  if (format === 'csv') {
    if (name === 'collar_limits') {
      const collarData = data as CollarResult;
      content = [
        'Coordenada,Raw_Min,Raw_Max,Min_Boundary,Max_Boundary',
        `EASTING,${collarData.EASTING.raw_min},${collarData.EASTING.raw_max},${collarData.EASTING.min_boundary},${collarData.EASTING.max_boundary}`,
        `NORTHING,${collarData.NORTHING.raw_min},${collarData.NORTHING.raw_max},${collarData.NORTHING.min_boundary},${collarData.NORTHING.max_boundary}`,
        `ELEVATION,${collarData.ELEVATION.raw_min},${collarData.ELEVATION.raw_max},${collarData.ELEVATION.min_boundary},${collarData.ELEVATION.max_boundary}`,
      ].join('\n');
    } else if (name === 'litho_values') {
      const lithoData = data as LithoResult;
      content = 'Columna,Valor\n';
      for (const [col, vals] of Object.entries(lithoData)) {
        content += vals.map((v) => `${col},${v}`).join('\n') + '\n';
      }
    }
  } else {
    content = JSON.stringify(data, null, 2);
  }

  fs.writeFileSync(filepath, content);
  return filepath;
}
