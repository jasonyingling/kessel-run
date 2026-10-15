import { WorkspaceService } from './service';

export function safeFilename(title: string) {
  const clean = title.normalize('NFKC').replace(/[^\p{L}\p{N} _.-]/gu, '').replace(/\.{2,}/g, '.').replace(/^[ .]+|[ .]+$/g, '').slice(0, 100);
  return `${clean || 'Kessel Run output'}.md`;
}

export async function exportOutput(service: WorkspaceService, outputId: string) {
  const { context: first, bundle, revisions } = await service.exportSnapshot(outputId);
  const sources = first.sources;
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
    ...sources.map(source => `### ${source.title}\nAttribution: ${source.attribution}\nType: ${source.sourceType}\nReference URL: ${source.referenceUrl ?? 'none'} (reference only; no retrieval claimed)\nSource hash: ${source.hash}\n\n${source.body}\n${source.dictation ? `\nRaw recognition (fallible; separate from submitted body):\n${(source.dictation as { recognizedText: string }).recognizedText}\nCleanup applied: ${String((source.dictation as { cleanupApplied: boolean }).cleanupApplied)}\n` : ''}`),
    '## Saved workflow artifacts\n',
    ...first.artifacts.map(artifact => `### ${artifact.title}\nKind: ${artifact.kind}\nArtifact hash: ${artifact.hash}\n\n${artifact.body}\n`),
    '## Current prose\n', first.output.body,
    '## Pending proposals\n', ...first.pending.map(proposal => `${proposal.title}: ${proposal.state}\n${proposal.evidence}\nPayload and decisions:\n${JSON.stringify({ payload: proposal.payload, ruleDecisions: proposal.ruleDecisions ?? {} })}\n`),
    '## Proposed profile rules\n', ...first.profileProposals.map(value => `### ${value.profile.title} · v${value.profile.version}\n${value.profile.body}\nEvidence: ${value.proposal.evidence}\n`),
    '## Retained machine / human / final snapshots\n', ...revisions.map(revision => `### ${revision.id} · ${revision.provenance}${revision.acceptedFinal ? ' · accepted final' : ''}\nParent: ${revision.parentRevision ?? 'none'}\nProse hash: ${revision.proseHash}\n\n${revision.prose}\n\nExact context/provenance:\n${JSON.stringify(revision.context)}\n`),
    '## Resume\nUse Kessel Run Start/Resume with these exact retained rules and supplied inputs. Pending proposals require a human decision. Export is not publishing.\n',
    '## Explicit restoration data\nRestore into a new empty app workspace only after reviewing its preview. This contains editorial files, including prior human decisions, never private runs, credentials or access tokens.\n',
    `\n\`\`\`kessel-run-handoff\n${JSON.stringify(bundle)}\n\`\`\`\n`,
  ].join('\n');
  return { filename: safeFilename(String(first.output.title)), prose: first.output.body, handoff };
}
