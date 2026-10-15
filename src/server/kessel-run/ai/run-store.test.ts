import { expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RunStore } from './run-store';
it('reloads persisted conversation and excludes concurrent ownership', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kr-run-'));
  try {
    const store = new RunStore(root);
    const scope = crypto.randomUUID();
    const release = await store.lock(scope);
    await expect(new RunStore(root).lock(scope)).rejects.toThrow('CONFLICT');
    const run = await store.start(scope, crypto.randomUUID(), 'gpt-5', 'Supplied synthetic notes');
    run.response = 'Saved synthetic response'; run.status = 'completed';
    await store.save(run);
    expect(await new RunStore(root).get(run.id)).toEqual(run);
    await release();
    await (await new RunStore(root).lock(scope))();
  } finally { await rm(root, { recursive: true, force: true }); }
});
