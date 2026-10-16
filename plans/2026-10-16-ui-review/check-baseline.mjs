// Read-only drift checker. Optional arguments filter repository path prefixes.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const baseline = JSON.parse(await readFile(resolve(here, 'baseline.json'), 'utf8'));
const prefixes = process.argv.slice(2);
const changed = [];
for (const [path, expected] of Object.entries(baseline.files)) {
  if (prefixes.length && !prefixes.some(prefix => path.startsWith(prefix))) continue;
  try {
    const actual = createHash('sha256').update(await readFile(resolve(root, path))).digest('hex');
    if (actual !== expected) changed.push(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    changed.push(`${path} (missing)`);
  }
}
console.log(changed.length ? `Baseline differs; reconcile before execution:\n${changed.join('\n')}` : 'Reviewed source hashes match.');
process.exitCode = changed.length ? 1 : 0;
