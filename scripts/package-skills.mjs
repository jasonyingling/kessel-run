import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync, mkdirSync, writeFileSync, renameSync, rmSync, chmodSync, realpathSync } from 'node:fs';
import { dirname, resolve, relative, sep, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const skillName = /^kessel-run-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const stat = path => lstatSync(path, { throwIfNoEntry: false });
export function safePath(input) {
  if (typeof input !== 'string' || !input || input.split(/[\\/]/).includes('..')) throw new Error('Invalid path');
  const path = resolve(input);
  let component = path;
  while (true) {
    const info = stat(component);
    if (info?.isSymbolicLink()) throw new Error(`Symlink path rejected: ${component}`);
    if (component === dirname(component)) break;
    component = dirname(component);
  }
  let existing = path;
  while (!stat(existing)) existing = dirname(existing);
  // native realpath resolves filesystem case aliases on macOS; the JS variant
  // can retain caller casing and is insufficient for overlap checks.
  return resolve(realpathSync.native(existing), relative(existing, path));
}
export function inside(root, path) {
  const rel = relative(root, path);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}
export const overlaps = (a, b) => inside(a, b) || inside(b, a);
export function walk(root) {
  safePath(root);
  const files = [];
  function visit(dir, prefix = '') {
    for (const name of readdirSync(dir).sort()) {
      const path = resolve(dir, name), rel = prefix ? `${prefix}/${name}` : name;
      const info = stat(path);
      if (info.isSymbolicLink()) throw new Error(`Source symlink rejected: ${path}`);
      if (info.isDirectory()) visit(path, rel);
      else if (info.isFile()) files.push({ path, relative: rel, mode: info.mode & 0o777 });
      else throw new Error(`Unsupported file: ${path}`);
    }
  }
  visit(root);
  return files;
}
const excluded = path => path.split('/').some(part => part.startsWith('.') || ['node_modules', '__pycache__', 'profiles', 'archives'].includes(part.toLowerCase())) || /(?:\.test\.[^.]+|\.spec\.[^.]+|\.(?:db|sqlite|sqlite3|zip|pyc))$/i.test(path);
const allowed = path => path === 'SKILL.md' || /^(?:references|scripts|assets|agents)\//.test(path);
export const hash = data => createHash('sha256').update(data).digest('hex');
export function collectSkills(repoRoot = REPO_ROOT) {
  const root = safePath(repoRoot);
  const source = safePath(resolve(root, 'src/mastra/skills'));
  const shared = readFileSync(safePath(resolve(root, 'src/mastra/skill-references/workspace.md')));
  const names = readdirSync(source).filter(name => name.startsWith('kessel-run-')).sort();
  if (!names.length) throw new Error('No skills found');
  const result = new Map();
  for (const name of names) {
    if (!skillName.test(name)) throw new Error(`Invalid skill name: ${name}`);
    const folder = safePath(resolve(source, name));
    const files = walk(folder).filter(file => allowed(file.relative) && !excluded(file.relative))
      .map(file => ({ ...file, data: readFileSync(file.path) }));
    const byName = new Map(files.map(file => [file.relative, file]));
    if (!byName.has('SKILL.md')) throw new Error(`Missing SKILL.md: ${name}`);
    const workspace = byName.get('references/workspace.md');
    if (!workspace || !workspace.data.equals(shared)) throw new Error(`Stale or missing workspace reference: ${name}; run skills:sync`);
    for (const file of files.filter(file => file.relative.endsWith('.md'))) {
      const body = file.data.toString('utf8').replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '');
      for (const match of body.matchAll(/\]\(([^)]+)\)/g)) {
        const link = match[1].replace(/^<|>$/g, '').split('#')[0];
        if (!link || /^[a-z][a-z0-9+.-]*:/i.test(link)) continue;
        const target = resolve(dirname(file.path), decodeURIComponent(link));
        if (!inside(folder, target)) throw new Error(`Reference escapes skill: ${name}/${file.relative}: ${link}`);
        const rel = relative(folder, target).split(sep).join('/');
        if (!byName.has(rel)) throw new Error(`Missing bundled reference: ${name}/${file.relative}: ${link}`);
      }
    }
    result.set(name, files);
  }
  return result;
}
export function writeFiles(destination, files) {
  for (const file of files) {
    const path = resolve(destination, file.relative);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.data);
    chmodSync(path, file.mode);
  }
}
/** @param {{repoRoot?: string, outputRoot?: string}} options */
export function packageSkills({ repoRoot = REPO_ROOT, outputRoot } = {}) {
  const root = safePath(repoRoot);
  const source = safePath(resolve(root, 'src/mastra/skills'));
  const template = safePath(resolve(root, 'plugin/kessel-run'));
  const approved = safePath(resolve(root, 'build'));
  const output = safePath(outputRoot ?? resolve(approved, 'kessel-run'));
  if (!inside(approved, output) || output === approved || overlaps(output, source) || overlaps(output, template)) throw new Error('Unsafe package output overlap or escape');
  if (stat(output) && !stat(output).isDirectory()) throw new Error('Package output must be a directory');
  // Complete source and reference validation before touching an existing output.
  const skills = collectSkills(root);
  const manifestSource = safePath(resolve(template, '.codex-plugin/plugin.json'));
  const files = [{ relative: 'kessel-run/.codex-plugin/plugin.json', data: readFileSync(manifestSource), mode: 0o644 }];
  for (const [name, entries] of skills) for (const file of entries) files.push({ ...file, relative: `kessel-run/skills/${name}/${file.relative}` });
  files.sort((a, b) => a.relative < b.relative ? -1 : a.relative > b.relative ? 1 : 0);
  const manifest = { schema_version: 1, files: files.map(file => ({ path: file.relative, sha256: hash(file.data) })) };
  mkdirSync(dirname(output), { recursive: true });
  const stage = safePath(`${output}.stage-${randomUUID()}`), old = safePath(`${output}.previous-${randomUUID()}`);
  let moved = false;
  try {
    mkdirSync(stage);
    writeFiles(stage, files);
    writeFileSync(resolve(stage, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    if (stat(output)) { renameSync(output, old); moved = true; }
    try { renameSync(stage, output); }
    catch (error) { if (moved) renameSync(old, output); throw error; }
    if (moved) rmSync(old, { recursive: true });
  } finally { if (stat(stage)) rmSync(stage, { recursive: true }); }
  return { output, manifest };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 2) throw new Error('skills:package takes no CLI arguments');
    const result = packageSkills();
    console.log(`Packaged ${result.manifest.files.length} files -> ${result.output}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
