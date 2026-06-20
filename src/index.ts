import { runCli } from './cli/index.js';

const args = process.argv.slice(2);
const help = args.includes('--help') || args.includes('-h');

if (help) {
  console.log('Uso: pnpm drill [opciones]\n');
  console.log('Opciones:');
  console.log('  --dir, -d <ruta>  Ruta a la carpeta con archivos .csv/.txt');
  console.log('  --help, -h        Muestra este mensaje de ayuda');
  process.exit(0);
}

let dir = process.cwd();
const dirIndex = args.findIndex(a => a === '--dir' || a === '-d');
if (dirIndex !== -1) {
  const val = args[dirIndex + 1];
  if (val) {
    dir = val;
  }
}

runCli(dir).catch(err => {
  console.error(err);
  process.exit(1);
});
