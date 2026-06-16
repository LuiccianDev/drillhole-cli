import fs from 'fs';

export function exportData(data, name, format) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const mainFilename = `${name}_${timestamp}.${format}`;
  const filesGenerated = [];

  if (format === 'csv') {
    const mainRows = [];
    const rangesRows = [];
    
    const firstVal = Object.values(data)[0];
    const subKeys = firstVal && typeof firstVal === 'object' 
      ? Object.keys(firstVal).filter(k => !Array.isArray(firstVal[k]))
      : ['VALUE'];
      
    const header = ['KEY', ...subKeys].join(',');
    mainRows.push(header);

    let rangesHeaderAdded = false;

    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'object') {
        const rowData = [key];
        for (const [k, v] of Object.entries(val)) {
          if (Array.isArray(v)) {
            if (!rangesHeaderAdded && v.length > 0) {
              const rangeKeys = Object.keys(v[0]);
              rangesRows.push(['KEY', ...rangeKeys].join(','));
              rangesHeaderAdded = true;
            }
            for (const r of v) {
              rangesRows.push([key, ...Object.values(r)].join(','));
            }
          } else {
            rowData.push(v);
          }
        }
        mainRows.push(rowData.join(','));
      } else {
        mainRows.push([key, val].join(','));
      }
    }

    if (rangesRows.length > 0) {
      const rangesFilename = `${name}_ranges_${timestamp}.${format}`;
      fs.writeFileSync(rangesFilename, rangesRows.join('\n'), 'utf8');
      filesGenerated.push(rangesFilename);
    } else {
      fs.writeFileSync(mainFilename, mainRows.join('\n'), 'utf8');
      filesGenerated.push(mainFilename);
    }

  } else {
    let content = `=== ${name.toUpperCase()} ===\n`;
    content += `Generado: ${new Date().toLocaleString()}\n`;
    content += '='.repeat(40) + '\n\n';
    
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'object') {
        content += `${key}:\n`;
        for (const [k, v] of Object.entries(val)) {
          if (Array.isArray(v)) {
            content += `  ${k} (${v.length} clases):\n`;
            content += `  ${'Clase'.padEnd(8)} ${'From'.padStart(10)} ${'To'.padStart(10)}   Percentil\n`;
            content += `  ${'─'.repeat(48)}\n`;
            for (const r of v) {
              content += `  ${String(r.clase).padEnd(8)} ${String(r.from).padStart(10)} ${String(r.to).padStart(10)}   ${r.percentil_from}% -> ${r.percentil_to}%\n`;
            }
          } else {
            content += `  ${k}: ${v}\n`;
          }
        }
        content += '\n';
      } else {
        content += `${key}: ${val}\n`;
      }
    }

    fs.writeFileSync(mainFilename, content, 'utf8');
    filesGenerated.push(mainFilename);
  }

  return filesGenerated.length === 1 ? filesGenerated[0] : filesGenerated;
}