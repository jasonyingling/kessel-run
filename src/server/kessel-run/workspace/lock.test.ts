import { expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { withWorkspaceLock } from './lock';

const childProgram = `
  import { createClient } from '@libsql/client';
  import { pathToFileURL } from 'node:url';
  const client = createClient({ url: pathToFileURL(process.argv[1]).href, timeout: 0 });
  while (true) {
    try {
      const transaction = await client.transaction('write');
      console.log('acquired');
      await new Promise(() => setInterval(() => {}, 1000));
      break;
    } catch (error) {
      if (!error.code?.startsWith('SQLITE_BUSY')) throw error;
      console.log('waiting');
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }
`;

it('excludes another process and automatically releases after process termination', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kr-lock-'));
  let child: ReturnType<typeof spawn> | undefined;
  try {
    await withWorkspaceLock(root, async () => {
      child = spawn(process.execPath, ['--input-type=module', '-e', childProgram, join(root, 'workspace-lock.db')], {
        cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'],
      });
      const [bytes] = await once(child.stdout!, 'data');
      expect(bytes.toString()).toContain('waiting');
    });
    let acquired = false;
    child!.stdout!.on('data', bytes => { if (bytes.toString().includes('acquired')) acquired = true; });
    const deadline = Date.now() + 2000;
    while (!acquired && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
    expect(acquired).toBe(true);
    await expect(withWorkspaceLock(root, async () => undefined, 30)).rejects.toThrow('CONFLICT');
    const exited = once(child!, 'exit');
    child!.kill('SIGKILL');
    await exited;
    expect(await withWorkspaceLock(root, async () => 'released')).toBe('released');
  } finally {
    child?.kill('SIGKILL');
    await rm(root, { recursive: true, force: true });
  }
});

it('serializes competing clients in one process without native busy-wait deadlock', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kr-lock-'));
  try {
    let active = 0;
    let peak = 0;
    await Promise.all(Array.from({ length: 8 }, () => withWorkspaceLock(root, async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 3));
      active--;
    })));
    expect(peak).toBe(1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
