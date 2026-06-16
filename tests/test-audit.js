import { parseFile } from '../src/parser.js';
import auditCmd from '../src/commands/audit.js';

try {
  console.log('Testing audit command on assays.txt...');
  auditCmd('assays.txt', { output: 'txt' });
} catch (err) {
  console.error(err);
}
