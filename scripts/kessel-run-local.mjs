import { spawn } from 'node:child_process';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, lstat, chmod, realpath } from 'node:fs/promises';
import { dirname, resolve, relative, sep } from 'node:path';
import { homedir } from 'node:os';
const mode = process.argv[2];
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 13)) throw new Error('Kessel Run requires Node 22.13.0 or later');
if (!['dev', 'start'].includes(mode)) throw new Error('Choose dev or start');
const port = Number(process.env.PORT ?? 3000);
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be 1024–65535');
const root = resolve(process.env.KESSEL_RUN_PRIVATE_ROOT ?? `${homedir()}/.local/share/kessel-run`);
let ancestor = root;
while (true) {
  const info = await lstat(ancestor).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  if (info?.isSymbolicLink() && !['/tmp', '/var'].includes(ancestor)) throw new Error('Private root must not traverse symlinks');
  if (ancestor === dirname(ancestor)) break;
  ancestor = dirname(ancestor);
}
const inRoot = (parent, child) => { const path = relative(parent, child); return !path || (!path.startsWith(`..${sep}`) && path !== '..'); };
for (const content of [process.cwd(), process.env.KESSEL_RUN_WORKSPACE_ROOT].filter(Boolean)) if (inRoot(resolve(content), root)) throw new Error('Private root must be outside app and content');
await mkdir(root, { recursive: true, mode: 0o700 });
const canonical = await realpath(root);
if (process.getuid && (await lstat(canonical)).uid !== process.getuid()) throw new Error('Private root must be owned by this user');
await chmod(canonical, 0o700);
const token = randomBytes(32).toString('hex');
let workspaceId = process.env.KESSEL_RUN_WORKSPACE_ID ?? randomUUID();
const workspaceConfigurationPath = resolve(canonical, 'workspace.json');
const workspaceInfo = await lstat(workspaceConfigurationPath).catch(error => {
  if (error.code !== 'ENOENT') throw error;
  return null;
});
if (workspaceInfo) {
  if (!workspaceInfo.isFile() || workspaceInfo.isSymbolicLink() || (process.getuid && workspaceInfo.uid !== process.getuid())) throw new Error('Workspace configuration must be an owner-controlled private regular file');
  await chmod(workspaceConfigurationPath, 0o600);
  try {
    const workspaceConfiguration = JSON.parse(await readFile(workspaceConfigurationPath, 'utf8'));
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(workspaceConfiguration.id) || typeof workspaceConfiguration.root !== 'string' || typeof workspaceConfiguration.privateDirectory !== 'string' || Object.keys(workspaceConfiguration).length !== 3) throw new Error('Invalid configuration');
    workspaceId = workspaceConfiguration.id;
  } catch {
    // Preserve damaged regular owner-controlled configuration for explicit repair.
    // An unbound identity allows pairing only; the app exposes recovery, not setup.
    workspaceId = randomUUID();
    console.error('Workspace configuration needs recovery. Original configuration preserved.');
  }
}
const temporary = resolve(canonical, `.pairing-${randomUUID()}.json`);
await writeFile(temporary, JSON.stringify({ tokenHash: createHash('sha256').update(token).digest('hex'), expires: Date.now() + 600000, workspaceId }), { mode: 0o600, flag: 'wx' });
await rename(temporary, resolve(canonical, 'pairing.json'));
const origin = `http://127.0.0.1:${port}`;
console.log(`Open Kessel Run within 10 minutes: ${origin}/kessel-run#pair=${token}`);
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', mode, '--hostname', '127.0.0.1', '--port', String(port)], { stdio: 'inherit', env: { ...process.env, KESSEL_RUN_PRIVATE_ROOT: canonical, KESSEL_RUN_ORIGIN: origin } });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 1));
