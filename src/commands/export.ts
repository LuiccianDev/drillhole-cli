import fs from 'fs';
import path from 'path';

export function exportData(data: any, name: string, format: 'txt' | 'csv' = 'txt'): string | string[] {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(process.cwd(), 'exports');
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  if (name === 'assay_limits' && format === 'csv') {
    // Assay exporta un CSV por cada columna
    const files: string[] = [];
    for (const [col, v] of Object.entries(data as any)) {
      const filename = `${name}_${col}_${timestamp}.csv`;
      const filepath = path.join(dir, filename);
      const content = [
        'Clase,From,To,Percentil_From,Percentil_To',
        ...(v as any).ranges.map((r: any) => `${r.clase},${r.from},${r.to},${r.percentil_from},${r.percentil_to}`)
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
      content = [
        'Coordenada,Raw_Min,Raw_Max,Min_Boundary,Max_Boundary',
        `EASTING,${(data as any).EASTING.raw_min},${(data as any).EASTING.raw_max},${(data as any).EASTING.min_boundary},${(data as any).EASTING.max_boundary}`,
        `NORTHING,${(data as any).NORTHING.raw_min},${(data as any).NORTHING.raw_max},${(data as any).NORTHING.min_boundary},${(data as any).NORTHING.max_boundary}`,
        `ELEVATION,${(data as any).ELEVATION.raw_min},${(data as any).ELEVATION.raw_max},${(data as any).ELEVATION.min_boundary},${(data as any).ELEVATION.max_boundary}`
      ].join('\n');
    } else if (name === 'litho_values') {
      content = 'Columna,Valor\n';
      for (const [col, vals] of Object.entries(data as any)) {
        content += (vals as string[]).map(v => `${col},${v}`).join('\n') + '\n';
      }
    }
  } else {
    // TXT format (pretty print)
    content = JSON.stringify(data, null, 2);
  }

  fs.writeFileSync(filepath, content);
  return filepath;
}
