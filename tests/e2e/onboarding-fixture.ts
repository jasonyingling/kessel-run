import { test as base, expect } from '@playwright/test';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';

type Launcher = { root: string; origin: string; start: () => Promise<string>; stop: () => Promise<void>; expire: () => Promise<void> };
export const test = base.extend<{ launcher: Launcher }>({
  launcher: async ({}, provide) => {
    const root = await mkdtemp(join(tmpdir(), 'kr-real-onboarding-'));
    const origin = 'http://127.0.0.1:3199';
    let child: ChildProcess | undefined;
    const stop = async () => {
      if (!child) return;
      const process = child; child = undefined;
      const exited = process.exitCode === null && process.signalCode === null ? once(process, 'exit') : Promise.resolve();
      process.kill('SIGTERM');
      const timer = setTimeout(() => process.kill('SIGKILL'), 5000);
      await exited; clearTimeout(timer);
    };
    const launcher: Launcher = {
      root, origin, stop,
      async start() {
        await stop();
        let output = '';
        // Real launcher + real pairing. No injected cookie, fake provider or key.
        const clean = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/API_KEY|TOKEN|SECRET|CREDENTIAL|KESSEL_RUN_|KR_E2E/.test(key)));
        child = spawn(process.execPath, ['scripts/kessel-run-local.mjs', 'start'], { env: { ...clean, NODE_ENV: 'production', PORT: '3199', OPENAI_API_KEY: '', KESSEL_RUN_PRIVATE_ROOT: join(root, 'private'), KESSEL_RUN_CONTENT_PARENT: join(root, 'content') }, stdio: ['ignore', 'pipe', 'pipe'] });
        child.stdout!.on('data', value => { output += value.toString(); });
        child.stderr!.on('data', () => { /* Do not print pairing fragments or private paths. */ });
        for (let attempt = 0; attempt < 120; attempt++) {
          if (child.exitCode !== null) throw new Error('Owned onboarding launcher exited before readiness');
          try {
            if (/#pair=[a-f0-9]{64}/.test(output) && (await fetch(`${origin}/kessel-run`)).ok) return `${origin}/kessel-run${output.match(/#pair=[a-f0-9]{64}/)![0]}`;
          } catch { /* bounded readiness wait */ }
          await new Promise(resolve => setTimeout(resolve, 250));
        }
        throw new Error('Owned onboarding launcher did not become ready');
      },
      async expire() {
        const path = join(root, 'private', 'pairing.json');
        const pairing = JSON.parse(await readFile(path, 'utf8'));
        await writeFile(path, JSON.stringify({ ...pairing, expires: Date.now() - 1 }), { mode: 0o600 });
      },
    };
    try { await provide(launcher); }
    finally { await stop(); await rm(root, { recursive: true, force: true }); }
  },
});
export { expect };
