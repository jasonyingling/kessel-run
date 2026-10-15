import { expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { WorkspaceService } from './service';
import { Journal } from './journal';

const execute = promisify(execFile);
const loader = `
  const fs = require('node:fs');
  const ts = require('typescript');
  require.extensions['.ts'] = (module, filename) => {
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    module._compile(compiled.outputText, filename);
  };
`;

it('reopens Markdown in a fresh process and recovers a process-killed multi-file operation', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'kr-process-'));
  const root = join(folder, 'content');
  const privateDirectory = join(folder, 'private');
  try {
    const service = new WorkspaceService(root, privateDirectory);
    const initial = await service.initialize({ operationId: crypto.randomUUID(), title: 'Fresh process fixture' });
    const parameters = JSON.stringify({ root, privateDirectory });
    const reopen = `${loader}
      const { WorkspaceService } = require(${JSON.stringify(resolve('src/server/kessel-run/workspace/service.ts'))});
      const input = ${parameters};
      new WorkspaceService(input.root, input.privateDirectory).overview().then(result => console.log(JSON.stringify(result.workspace)));
    `;
    const result = await execute(process.execPath, ['-e', reopen], { cwd: process.cwd(), env: { NODE_ENV: 'test' } });
    expect(JSON.parse(result.stdout).id).toBe(initial.id);
    const crash = `${loader}
      const { Journal } = require(${JSON.stringify(resolve('src/server/kessel-run/workspace/journal.ts'))});
      const input = ${parameters};
      new Journal(input.root, input.privateDirectory).transaction(${JSON.stringify(crypto.randomUUID())}, { fixture: true }, async () => ({
        writes: [{ path: 'Retained.md', previousHash: null, text: 'crash retained text' }, { path: 'Pointer.md', previousHash: null, text: 'crash pointer' }],
        result: { saved: true },
      }), index => { if (index === 0) process.kill(process.pid, 'SIGKILL'); });
    `;
    await expect(execute(process.execPath, ['-e', crash], { cwd: process.cwd(), env: { NODE_ENV: 'test' } })).rejects.toMatchObject({ signal: 'SIGKILL' });
    await new Journal(root, privateDirectory).readLocked(async () => undefined);
    expect(await readFile(join(root, 'Retained.md'), 'utf8')).toBe('crash retained text');
    expect(await readFile(join(root, 'Pointer.md'), 'utf8')).toBe('crash pointer');
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
