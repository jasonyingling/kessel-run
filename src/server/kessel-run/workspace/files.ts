import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, readdir, realpath, rename } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { parseDocument, stringify } from 'yaml';
import { WorkspaceError } from './schema';

export const hashText = (text: string) => createHash('sha256').update(text).digest('hex');
export type Note = { metadata: Record<string, unknown>; body: string; hash: string; path: string };
export function parseNote(text: string, path: string): Note {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!match) throw new WorkspaceError('INVALID_INPUT', `Missing Markdown metadata: ${path}`);
  const yaml = parseDocument(match[1], { uniqueKeys: true });
  if (yaml.errors.length) throw new WorkspaceError('INVALID_INPUT', `Corrupt Markdown metadata: ${path}`);
  const metadata = yaml.toJS({ maxAliasCount: 0 });
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new WorkspaceError('INVALID_INPUT', `Invalid Markdown metadata: ${path}`);
  }
  return { metadata, body: text.slice(match[0].length), hash: hashText(text), path };
}
export const noteText = (metadata: Record<string, unknown>, body: string) => `---\n${stringify(metadata)}---\n${body}`;

export async function safePath(root: string, path: string, createParents = false) {
  if (isAbsolute(path) || path.split(/[\\/]/).some(part => part === '..' || part === '.')) {
    throw new WorkspaceError('INVALID_INPUT', 'Invalid workspace path');
  }
  const base = resolve(root);
  const target = resolve(base, path);
  const inside = relative(base, target);
  if (inside.startsWith(`..${sep}`) || inside === '..' || isAbsolute(inside)) {
    throw new WorkspaceError('INVALID_INPUT', 'Path escapes workspace');
  }
  let ancestor = base;
  while (true) {
    const info = await lstat(ancestor).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (info?.isSymbolicLink() && !['/tmp', '/var'].includes(ancestor)) {
      throw new WorkspaceError('INVALID_INPUT', 'Symlinks are not accepted');
    }
    if (ancestor === dirname(ancestor)) break;
    ancestor = dirname(ancestor);
  }
  if (createParents) await mkdir(base, { recursive: true });
  const canonical = await realpath(base);
  let cursor = canonical;
  for (const part of path.split('/').filter(Boolean)) {
    cursor = resolve(cursor, part);
    const info = await lstat(cursor).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (info?.isSymbolicLink()) throw new WorkspaceError('INVALID_INPUT', 'Symlinks are not accepted');
  }
  if (createParents) await mkdir(dirname(cursor), { recursive: true });
  return cursor;
}

export async function readText(root: string, path: string) {
  return readFile(await safePath(root, path), 'utf8');
}
export async function optionalText(root: string, path: string) {
  try { return await readText(root, path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
export async function atomicWrite(root: string, path: string, text: string) {
  const target = await safePath(root, path, true);
  const temporary = resolve(dirname(target), `.kr-${randomUUID()}.tmp`);
  const handle = await open(temporary, 'wx', 0o600);
  try { await handle.writeFile(text); await handle.sync(); }
  finally { await handle.close(); }
  await rename(temporary, target);
  const directory = await open(dirname(target), 'r');
  try { await directory.sync(); }
  finally { await directory.close(); }
}
export async function markdownPaths(root: string, folder = ''): Promise<string[]> {
  const entries = await readdir(await safePath(root, folder), { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries) {
    const path = folder ? `${folder}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new WorkspaceError('INVALID_INPUT', 'Workspace contains a symlink');
    if (entry.isDirectory()) paths.push(...await markdownPaths(root, path));
    else if (entry.name.endsWith('.md')) paths.push(path);
  }
  return paths.sort();
}
