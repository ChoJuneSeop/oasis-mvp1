import { readFile, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const sourcePath = new URL('./reality-flow-deferred-judgment-relational-recurrentization-stage31.mjs', import.meta.url);
const tempPath = new URL('./.stage31-harness-fixed.mjs', import.meta.url);

let source = await readFile(sourcePath, 'utf8');
const beforeControl = 'cleanPage:errors.length===0,';
const afterControl = 'cleanPage:true,';
const beforeReport = 'report.errors=errors;';
const afterReport = 'report.errors=errors;\n  report.controls.cleanPage=errors.length===0;';

if (!source.includes(beforeControl)) throw new Error('HARNESS PATCH FAIL - cleanPage browser-scope reference not found');
if (!source.includes(beforeReport)) throw new Error('HARNESS PATCH FAIL - report.errors assignment not found');

source = source.replace(beforeControl, afterControl).replace(beforeReport, afterReport);
await writeFile(tempPath, source, 'utf8');

try {
  await import(`${pathToFileURL(tempPath.pathname).href}?run=${Date.now()}`);
} finally {
  await rm(tempPath, { force: true });
}
