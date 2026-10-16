import { expect, it } from 'vitest';
import { connectionFailure } from './connection-result';
it('requires a persisted completed candidate to report success', () => {
  expect(connectionFailure({ status: 'completed', candidateId: 'saved' })).toBeNull();
  expect(connectionFailure({ status: 'completed', candidateId: null })).not.toBeNull();
});
it('separates model limits, incomplete saves and interruption from credential failures', () => {
  expect(connectionFailure({ status: 'failed', failure: 'output-limit' })).toContain('output limit');
  expect(connectionFailure({ status: 'failed', failure: 'no-candidate' })).toContain('does not mean');
  expect(connectionFailure({ status: 'interrupted' })).toContain('stopped or timed out');
  expect(connectionFailure({ status: 'failed', failure: 'provider' })).toContain('model access and API billing');
});
