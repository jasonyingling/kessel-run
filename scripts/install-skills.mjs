import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, collectSkills, safePath, stat, overlaps, skillName, walk, hash, writeFiles } from './package-skills.mjs';
import { readFileSync } from 'node:fs';

function unchanged(target, files) {
  if (!stat(target)) return false;
  const existing = walk(target);
  const expected = new Map(files.map(file => [file.relative, file]));
  return existing.length === files.length && existing.every(file => {
    const source = expected.get(file.relative);
    return source && file.mode === source.mode && hash(readFileSync(file.path)) === hash(source.data);
  });
}
/**
 * @param {{destination: string, names?: string[], repoRoot?: string, beforeActivate?: (name: string) => void}} options
 * @returns {{name: string, destination: string, status: string, backup?: string}[]}
 */
export function installSkills({ destination, names = [], repoRoot = REPO_ROOT, beforeActivate }) {
  const root = safePath(repoRoot);
  const dest = safePath(destination);
  const protectedRoots = ['src/mastra/skills', 'src/mastra/skill-references', 'plugin/kessel-run', 'build'].map(path => safePath(resolve(root, path)));
  const parent = dirname(dest);
  if (['.kessel-run-skill-backups', '.kessel-run-skill-staging'].includes(basename(dest).toLowerCase())) throw new Error('Reserved install destination');
  // Reserve the repository build tree even before it exists (including aliases).
  if (relative(root, dest).split(/[\\/]/)[0].toLowerCase() === 'build') throw new Error('Unsafe install destination overlap');
  const backupRoot = safePath(resolve(parent, '.kessel-run-skill-backups'));
  const stagingRoot = safePath(resolve(parent, '.kessel-run-skill-staging'));
  if (dest === parent || protectedRoots.some(path => overlaps(path, dest)) || overlaps(dest, backupRoot) || overlaps(dest, stagingRoot)) throw new Error('Unsafe install destination overlap');
  for (const path of [dest, backupRoot, stagingRoot]) if (stat(path) && !stat(path).isDirectory()) throw new Error(`Expected directory: ${path}`);
  const skills = collectSkills(root);
  const selected = names.length ? [...new Set(names)] : [...skills.keys()];
  // Validate the entire batch and all existing trees before creating directories.
  for (const name of selected) if (!skillName.test(name) || !skills.has(name)) throw new Error(`Unknown or invalid skill: ${name}`);
  const entries = selected.map(name => {
    const target = safePath(resolve(dest, name));
    if (stat(target) && !stat(target).isDirectory()) throw new Error(`Installed skill is not a directory: ${target}`);
    return { name, target, files: skills.get(name), unchanged: unchanged(target, skills.get(name)) };
  });
  if (entries.every(entry => entry.unchanged)) return entries.map(entry => ({ name: entry.name, destination: entry.target, status: 'unchanged' }));
  mkdirSync(dest, { recursive: true });
  mkdirSync(stagingRoot, { recursive: true });
  mkdirSync(backupRoot, { recursive: true });
  const session = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
  const stage = safePath(resolve(stagingRoot, session));
  mkdirSync(stage);
  const results = [];
  try {
    // Stage every changed skill before the first replacement.
    for (const entry of entries.filter(entry => !entry.unchanged)) writeFiles(resolve(stage, entry.name), entry.files);
    for (const entry of entries) {
      if (entry.unchanged) { results.push({ name: entry.name, destination: entry.target, status: 'unchanged' }); continue; }
      const backup = safePath(resolve(backupRoot, `${entry.name}-${session}`));
      let saved = false;
      try {
        if (stat(entry.target)) { renameSync(entry.target, backup); saved = true; }
        // Injectable only via the imported API, for deterministic failure testing.
        beforeActivate?.(entry.name);
        renameSync(resolve(stage, entry.name), entry.target);
      } catch (error) {
        if (saved) {
          try { renameSync(backup, entry.target); }
          catch (rollbackError) { throw new Error(`Install failed: ${error.message}; restore failed: ${rollbackError.message}; original remains at ${backup}`); }
        }
        throw new Error(`Install failed for ${entry.name}; ${saved ? 'original restored' : 'original unchanged'}: ${error.message}`);
      }
      results.push({ name: entry.name, destination: entry.target, status: 'installed', ...(saved ? { backup } : {}) });
    }
    return results;
  } catch (error) {
    error.results = results;
    throw error;
  } finally { if (stat(stage)) rmSync(stage, { recursive: true }); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args[0] !== '--destination' || !args[1] || args[1].startsWith('--')) throw new Error('Usage: install-skills.mjs --destination <skills-directory> [skill names...]');
    for (const result of installSkills({ destination: args[1], names: args.slice(2) })) console.log(JSON.stringify(result));
  } catch (error) {
    for (const result of error.results ?? []) console.log(JSON.stringify(result));
    console.error(error.message);
    process.exitCode = 1;
  }
}
