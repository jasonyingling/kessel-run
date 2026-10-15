import { expect, it } from 'vitest';
import { CleanupRevision } from './cleanup-controller';
it('rejects same-text responses after intervening edits and cancellations', () => { const c = new CleanupRevision(); const snapshot = c.snapshot('original'); expect(c.current(snapshot, 'original')).toBe(true); c.edit(); c.edit(); expect(c.current(snapshot, 'original')).toBe(false); const next = c.snapshot('original'); c.cancel(); expect(c.current(next, 'original')).toBe(false); });
it('permits undo only before an intervening edit; keeps original for comparison', () => { const c = new CleanupRevision(); c.applied('um original', 'original'); expect(c.canUndo('original')).toBe(true); c.edit(); expect(c.canUndo('original')).toBe(false); expect(c.undo?.original).toBe('um original'); });
