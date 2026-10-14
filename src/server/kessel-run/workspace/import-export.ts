import { WorkspaceService } from './service';

export function safeFilename(title: string) {
  const clean = title.normalize('NFKC').replace(/[^\p{L}\p{N} _.-]/gu, '').replace(/\.{2,}/g, '.').replace(/^[ .]+|[ .]+$/g, '').slice(0, 100);
  return `${clean || 'Kessel Run output'}.md`;
}

export async function exportOutput(service: WorkspaceService, outputId: string) {
  const first = await service.getContext(outputId);
  const sources = [...first.sources];
  let next = first.nextSourceOffset;
  while (next !== null) {
    const page = await service.getContext(outputId, next);
    if (page.contextHash !== first.contextHash) throw new Error('CONFLICT: Context changed during export; retry');
    sources.push(...page.sources);
    next = page.nextSourceOffset;
  }
  const handoff = [
    `# ${first.output.title}\n`,
    '## Exact output selections\n',
    `Publication: ${first.output.publicationId}\nOutput: ${first.output.id}\nFormat: ${first.output.format}\nPreset: ${first.output.preset}\nStatus: ${first.output.status}\nVoice: ${JSON.stringify(first.output.voice)}\nAuthor: ${JSON.stringify(first.output.author)}\nContext hash: ${first.contextHash}\n`,
    '## Publication voice rules\n', first.voice.body,
    '## Author differences\n', first.author?.body ?? 'No author overlay selected.\n',
    '## Format requirements\n', first.preset.body || `Selected format: ${first.preset.format}. No additional preset instructions supplied.\n`,
    '## Brief\n', first.brief.body,
    '## Decisions and next action\n', `${JSON.stringify(first.brief.decisions)}\n${first.brief.nextAction}\n`,
    '## Supplied source material\n',
    ...sources.map(source => `### ${source.title}\nAttribution: ${source.attribution}\nType: ${source.sourceType}\nReference URL: ${source.referenceUrl ?? 'none'} (reference only; no retrieval claimed)\nSource hash: ${source.hash}\n\n${source.body}\n`),
    '## Current prose\n', first.output.body,
    '## Pending proposals\n', ...first.pending.map(proposal => `${proposal.title}: ${proposal.state}\n${proposal.evidence}\n`),
    '## Resume\nUse Kessel Run Start/Resume with these exact retained rules and supplied inputs. Pending proposals require a human decision. Export is not publishing.\n',
  ].join('\n');
  return { filename: safeFilename(String(first.output.title)), prose: first.output.body, handoff };
}
