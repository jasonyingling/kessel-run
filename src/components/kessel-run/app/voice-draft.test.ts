import { expect, it } from 'vitest';
import { voiceDraft } from './voice-draft';
import { emptyPreferences } from '@/lib/kessel-run/starter-voice';
it('validates every recovered preference, identity and preview before rendering', () => {
  const draft = { mode: 'starter', title: 'Supplied', prose: 'Exact words\r\n', provenance: '', preferences: emptyPreferences, parent: '', authorId: crypto.randomUUID(), preview: { publicationHash: 'a'.repeat(64) } };
  expect(voiceDraft.parse(draft).prose).toBe(draft.prose);
  for (const invalid of [{ ...draft, preferences: { ...emptyPreferences, rules: 3 } }, { ...draft, title: [] }, { ...draft, preview: {} }, { ...draft, authorId: 'wrong' }, { ...draft, parent: 'missing' }]) expect(voiceDraft.safeParse(invalid).success).toBe(false);
});
