import { expect, it } from 'vitest';
import { completedUnchangedSubmission } from './dictation-submission';
it.each(['failed', 'interrupted', undefined])('retains original text for terminal %s in an HTTP200 stream', terminal => { expect(completedUnchangedSubmission(terminal, 'scope', 'scope', 'original', 'original')).toBe(false); });
it('clears only completed unchanged text in the original scope', () => { expect(completedUnchangedSubmission('completed', 'scope', 'scope', 'original', 'original')).toBe(true); expect(completedUnchangedSubmission('completed', 'scope', 'other', 'original', 'original')).toBe(false); expect(completedUnchangedSubmission('completed', 'scope', 'scope', 'original', 'new typing')).toBe(false); });
