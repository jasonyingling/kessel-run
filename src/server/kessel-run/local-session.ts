import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, open, mkdir, rename, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { chmodSync, lstatSync, mkdirSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, sep } from 'node:path';
import { z } from 'zod';

export const SESSION_COOKIE = 'kr-local-session';
function contains(parent: string, child: string) {
  const path = relative(parent, child);
  return !path || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}
export function securePrivateRoot(root: string) {
  const absolute = resolve(root);
  // Refuse linked ancestors, including a linked directory that does not yet
  // have the final private subdirectory. /tmp is a platform alias on macOS.
  let ancestor = absolute;
  while (true) {
    try {
      const info = lstatSync(ancestor);
      if (info.isSymbolicLink() && !['/tmp', '/var'].includes(ancestor)) throw new LocalAccessError();
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (ancestor === dirname(ancestor)) break;
    ancestor = dirname(ancestor);
  }
  const protectedRoots = [process.cwd(), process.env.KESSEL_RUN_WORKSPACE_ROOT].filter((v): v is string => Boolean(v));
  for (const protectedRoot of protectedRoots) {
    if (contains(resolve(protectedRoot), absolute)) throw new LocalAccessError();
  }
  mkdirSync(absolute, { recursive: true, mode: 0o700 });
  const canonical = realpathSync(absolute);
  for (const protectedRoot of protectedRoots) {
    const canonicalProtected = (() => { try { return realpathSync(protectedRoot); } catch { return resolve(protectedRoot); } })();
    if (contains(canonicalProtected, canonical)) throw new LocalAccessError();
  }
  if (process.getuid && lstatSync(canonical).uid !== process.getuid()) throw new LocalAccessError();
  chmodSync(canonical, 0o700);
  return canonical;
}
export const privateRoot = () => securePrivateRoot(process.env.KESSEL_RUN_PRIVATE_ROOT ?? `${homedir()}/.local/share/kessel-run`);
export function privateFile(name: string, root = privateRoot()) {
  if (!/^[a-zA-Z0-9.-]+$/.test(name)) throw new LocalAccessError();
  const path = resolve(securePrivateRoot(root), name);
  try {
    const info = lstatSync(path);
    if (!info.isFile() || info.isSymbolicLink() || (process.getuid && info.uid !== process.getuid())) throw new LocalAccessError();
    chmodSync(path, 0o600);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return path;
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const sessionSchema = z.object({ tokenHash: z.string().regex(/^[a-f0-9]{64}$/), expires: z.number().finite(), workspaceId: z.string().uuid() }).strict();
export class LocalAccessError extends Error {
  constructor(public readonly status = 403, public readonly reason: 'local-access' | 'configured-origin' | 'host' | 'url-origin' | 'origin' | 'cross-site' = 'local-access') { super('Local access denied'); }
}
export function requireWorkspaceReference(request: Request, workspaceId: string) {
  const reference = request.headers.get('x-kr-workspace-ref');
  if (!reference || reference !== workspaceId) throw new LocalAccessError(409);
}
export async function boundedJSON(request: Request, maximumBytes = 100000) {
  const reader = request.body?.getReader();
  if (!reader) throw new LocalAccessError(400);
  const parts: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > maximumBytes) {
      await reader.cancel();
      throw new LocalAccessError(413);
    }
    parts.push(chunk.value);
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(parts)));
}
export function requireLocalRequest(request: Request, mutation = false) {
  const configured = process.env.KESSEL_RUN_ORIGIN ?? 'http://127.0.0.1:3000';
  const url = new URL(configured);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:') throw new LocalAccessError(403, 'configured-origin');
  if (request.headers.get('host') !== url.host) throw new LocalAccessError(403, 'host');
  // Next 16's NextURL rewrites loopback request.url hostnames to localhost.
  // Constructor identity can differ between bundled Next modules. Recognize
  // only the exact normalized origin, retaining configured protocol and port.
  // External Host and browser Origin below remain exact, with no aliasing.
  const normalized = new URL(url.origin);
  normalized.hostname = 'localhost';
  const internalOrigin = new URL(request.url).origin;
  if (internalOrigin !== url.origin && internalOrigin !== normalized.origin) throw new LocalAccessError(403, 'url-origin');
  const origin = request.headers.get('origin');
  if ((mutation && origin !== url.origin) || (origin && origin !== url.origin)) throw new LocalAccessError(403, 'origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw new LocalAccessError(403, 'cross-site');
}
export async function ownerWrite(name: string, value: unknown, root = privateRoot()) {
  root = securePrivateRoot(root);
  privateFile(name, root);
  await mkdir(root, { recursive: true, mode: 0o700 });
  const temporary = resolve(root, `.${name}.${randomBytes(16).toString('hex')}`);
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(JSON.stringify(value));
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, resolve(root, name));
  const directory = await open(root, 'r');
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}
export async function requireLocalSession(request: Request, mutation = false) {
  requireLocalRequest(request, mutation);
  const cookie = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!cookie || !/^[a-f0-9]{64}$/.test(cookie)) throw new LocalAccessError(401);
  let session: { tokenHash: string; expires: number; workspaceId: string };
  try { session = sessionSchema.parse(JSON.parse(await readFile(privateFile('session.json'), 'utf8'))); }
  catch { throw new LocalAccessError(401); }
  const actual = Buffer.from(hash(cookie));
  const expected = Buffer.from(session.tokenHash);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected) || session.expires < Date.now()) throw new LocalAccessError(401);
  if (mutation && request.headers.get('x-kr-csrf') !== 'local') throw new LocalAccessError();
  return { workspaceId: session.workspaceId };
}
export async function exchangePairing(request: Request, token: string) {
  requireLocalRequest(request, true);
  // Claim the single-use file atomically across Next workers before comparing.
  const root = privateRoot();
  const claimed = resolve(root, `pairing.${randomBytes(16).toString('hex')}.json`);
  try { await rename(privateFile('pairing.json', root), claimed); }
  catch { throw new LocalAccessError(401); }
  try {
    const pairing = sessionSchema.parse(JSON.parse(await readFile(claimed, 'utf8')));
    const expected = Buffer.from(pairing.tokenHash);
    const actual = Buffer.from(hash(token));
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected) || pairing.expires < Date.now()) throw new LocalAccessError(401);
    const sessionToken = randomBytes(32).toString('hex');
    await ownerWrite('session.json', { tokenHash: hash(sessionToken), expires: Date.now() + 86400000, workspaceId: pairing.workspaceId });
    return sessionToken;
  } finally { await unlink(claimed); }
}
