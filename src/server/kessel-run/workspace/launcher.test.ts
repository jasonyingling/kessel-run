import { afterEach, beforeEach, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const exec = promisify(execFile);
const launcher = resolve('scripts/kessel-run-local.mjs');
let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'kr-launcher-')); await mkdir(join(root, 'app', 'node_modules', 'next', 'dist', 'bin'), { recursive: true }); await writeFile(join(root, 'app', 'node_modules', 'next', 'dist', 'bin', 'next'), 'console.log("SYNTHETIC_NEXT_STARTED")'); await mkdir(join(root, 'private')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });
const launch = () => exec(process.execPath, [launcher, 'start'], { cwd: join(root, 'app'), env: { NODE_ENV: 'test', PATH: process.env.PATH, PORT: '3199', KESSEL_RUN_PRIVATE_ROOT: join(root, 'private') } });
it('starts in safe recovery for malformed regular configuration without modifying its bytes', async () => {
  const path = join(root, 'private', 'workspace.json');
  await writeFile(path, '{corrupt', { mode: 0o600 });
  const result = await launch();
  expect(result.stdout).toContain('/kessel-run#pair='); expect(result.stdout).not.toContain('settings#pair');
  expect(result.stdout).toContain('SYNTHETIC_NEXT_STARTED');
  expect(result.stderr).toContain('Original configuration preserved');
  expect(await readFile(path, 'utf8')).toBe('{corrupt');
});
it('refuses linked private roots and linked configuration before starting Next', async () => {
  await writeFile(join(root, 'target'), '{}');
  await symlink(join(root, 'target'), join(root, 'private', 'workspace.json'));
  await expect(launch()).rejects.toMatchObject({ stderr: expect.stringContaining('owner-controlled private regular file') });
  await rm(join(root, 'private'), { recursive: true });
  await mkdir(join(root, 'other')); await symlink(join(root, 'other'), join(root, 'private'));
  await expect(launch()).rejects.toMatchObject({ stderr: expect.stringContaining('must not traverse symlinks') });
});
