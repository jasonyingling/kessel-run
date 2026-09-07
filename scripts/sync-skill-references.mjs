import { mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync, existsSync, lstatSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const check = args.includes('--check');
const fixtureIndex = args.indexOf('--fixture-root');
const allowed = new Set(['--check', '--fixture-root']);
for (let i = 0; i < args.length; i++) {
  if (!allowed.has(args[i])) throw new Error(`Unknown argument: ${args[i]}`);
  if (args[i] === '--fixture-root') {
    if (!args[++i] || args[i].startsWith('--')) throw new Error('Missing fixture root');
  }
}
const root = realpathSync(fixtureIndex < 0 ? resolve(dirname(fileURLToPath(import.meta.url)), '..') : args[fixtureIndex + 1]);
// Check every existing component: fixture symlinks must never escape its root.
function within(path) {
  let current = path;
  while (!existsSync(current)) {
    if (lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) {
      throw new Error(`Dangling symlink: ${current}`);
    }
    current = dirname(current);
  }
  const rel = relative(root, realpathSync(current));
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`Path escapes root: ${path}`);
  return path;
}
const canonical = readFileSync(within(resolve(root, 'src/mastra/skill-references/workspace.md')), 'utf8');
const skills = within(resolve(root, 'src/mastra/skills'));
const names = readdirSync(skills, { withFileTypes: true })
  .filter(entry => entry.name.startsWith('kessel-run-') && (entry.isDirectory() || entry.isSymbolicLink()))
  .map(entry => entry.name).sort();
if (!names.length) throw new Error('No Kessel Run skills found');
const targets = names.map(name => {
  const dir = within(resolve(skills, name));
  if (!existsSync(within(resolve(dir, 'SKILL.md')))) throw new Error(`Missing SKILL.md: ${name}`);
  const target = within(resolve(dir, 'references/workspace.md'));
  return { name, target };
});
let drift = false;
for (const { name, target } of targets) {
  const matches = existsSync(target) && readFileSync(target, 'utf8') === canonical;
  if (check && !matches) {
    console.error(`Missing or stale workspace reference: ${name}`);
    drift = true;
  } else if (!check && !matches) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, canonical);
  }
}
if (drift) process.exitCode = 1;
else console.log(`${check ? 'Checked' : 'Synced'} ${names.length} workspace references`);
