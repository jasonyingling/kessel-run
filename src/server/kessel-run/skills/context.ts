import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { KESSEL_RUN_SKILLS, isKesselRunSkillName } from '@/mastra/skills/catalog';
import { WorkspaceError } from '../workspace/schema';

export async function workflowContext(name = 'kessel-run-start', offset = 0) {
  if (!isKesselRunSkillName(name)) throw new WorkspaceError('INVALID_INPUT', 'Select an allowlisted canonical workflow');
  z.number().int().nonnegative().parse(offset);
  const directory = resolve(process.cwd(), 'src/mastra/skills', name);
  const references = (await readdir(resolve(directory, 'references'))).filter(file => /^[a-z-]+\.md$/.test(file)).sort();
  const files = [{ filename: 'SKILL.md', text: await readFile(resolve(directory, 'SKILL.md'), 'utf8') }];
  for (const filename of references) files.push({ filename: `references/${filename}`, text: await readFile(resolve(directory, 'references', filename), 'utf8') });
  const content = files.map(file => `# ${file.filename}\n\n${file.text}`).join('\n\n');
  const page = content.slice(offset, offset + 16000);
  return {
    name, stage: KESSEL_RUN_SKILLS.find(skill => skill.name === name)!.stage,
    contentHash: createHash('sha256').update(content).digest('hex'),
    instructions: page, nextOffset: offset + page.length < content.length ? offset + page.length : null,
    totalCharacters: content.length,
  };
}
