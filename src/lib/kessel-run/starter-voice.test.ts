import { expect, it } from 'vitest';
import { emptyPreferences, starterVoice } from './starter-voice';
it('includes only supplied preferences and preserves their prose exactly', () => {
  expect(starterVoice(emptyPreferences)).toBe('');
  const rules = '  Use my exact words.\r\nKeep this spacing.  ';
  expect(starterVoice({ ...emptyPreferences, tone: '  ', rules })).toBe(`## Other preferences\n\n${rules}`);
  expect(starterVoice({ ...emptyPreferences, reader: 'Feel informed.', tone: 'Candid.' })).toBe('## Reader experience\n\nFeel informed.\n\n## Tone and opinion\n\nCandid.');
});
