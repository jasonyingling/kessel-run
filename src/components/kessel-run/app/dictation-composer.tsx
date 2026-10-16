'use client';
import { useEffect, useLayoutEffect, useImperativeHandle, useRef, useState } from 'react';
import { AppButton } from './workspace';
import { DictationController, browserRecognition, browserSpeechAvailable } from './dictation-controller';
import { CleanupRevision } from './cleanup-controller';
import { getWorkspaceReference, localApi } from '@/lib/kessel-run/local-api';
export type ComposerHandle = { freeze: () => string; provenance: () => { recognizedText: string; cleanupApplied: boolean } | undefined };
export function DictationComposer({ value, onChange, scope, scopeKind, source, model, disabled, cleanupDisabled, action, handle, label = 'Message', limit = 20000 }: {
  value: string; onChange: (text: string) => void; scope: string; scopeKind: 'output' | 'voice' | 'source'; source: string; model: string; disabled?: boolean; cleanupDisabled?: boolean; action?: React.ReactNode; handle: React.Ref<ComposerHandle>; label?: string; limit?: number;
}) {
  const [, render] = useState(0);
  const [status, setStatus] = useState('');
  const [cleaning, setCleaning] = useState(false);
  const [cleanupApplied, setCleanupApplied] = useState(false);
  const previousCleanupApplied = useRef(false);
  const text = useRef(value);
  const changed = useRef(onChange);
  useLayoutEffect(() => { text.current = value; changed.current = onChange; }, [value, onChange]);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<{ element: HTMLTextAreaElement; range: readonly [number, number, 'forward' | 'backward' | 'none']; revision: number } | null>(null);
  const [revision] = useState(() => new CleanupRevision());
  const abort = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  // The constructor only stores callbacks; refs are read after user gestures/events.
  // eslint-disable-next-line react-hooks/refs
  const [dictation] = useState(() => new DictationController({ factory: browserRecognition, limit,
    changed: () => { if (mounted.current) render(count => count + 1); },
    append: fragment => {
      const previous = text.current;
      const separator = previous && !/\s$/.test(previous) && !/^\s/.test(fragment) ? ' ' : '';
      const next = previous + separator + fragment;
      if (next.length > limit) return false;
      const element = textarea.current;
      const selection = element ? [element.selectionStart, element.selectionEnd, element.selectionDirection] as const : null;
      text.current = next; revision.edit(); changed.current(next);
      // Appending leaves the writer's selection and focus in place.
      if (element && selection && document.activeElement === element) pendingSelection.current = { element, range: selection, revision: revision.revision };
      return true;
    },
  }));
  useLayoutEffect(() => {
    const pending = pendingSelection.current; pendingSelection.current = null;
    if (pending && revision.revision === pending.revision && textarea.current === pending.element && document.activeElement === pending.element) pending.element.setSelectionRange(...pending.range);
  }, [value, revision]);
  function cancelCleanup() { revision.cancel(); abort.current?.abort(); abort.current = null; setCleaning(false); }
  function freeze() { dictation.invalidate(); cancelCleanup(); return text.current; }
  useImperativeHandle(handle, () => ({ freeze, provenance: () => dictation.recognizedText ? { recognizedText: dictation.recognizedText, cleanupApplied } : undefined }));
  useEffect(() => {
    mounted.current = true;
    dictation.invalidate();
    if (!browserSpeechAvailable()) dictation.unavailable();
    const hide = () => { if (document.hidden) { dictation.invalidate(); revision.cancel(); abort.current?.abort(); setCleaning(false); } };
    document.addEventListener('visibilitychange', hide);
    return () => { mounted.current = false; dictation.invalidate(); revision.cancel(); abort.current?.abort(); document.removeEventListener('visibilitychange', hide); };
  }, [dictation, scope, source, model, revision]);
  async function cleanup() {
    dictation.invalidate(); cancelCleanup();
    const snapshot = revision.snapshot(text.current);
    const workspace = getWorkspaceReference();
    const controller = new AbortController(); abort.current = controller;
    const requestId = crypto.randomUUID(); setCleaning(true); setStatus('Cleaning up with the selected model. This may incur API charges.');
    try {
      const result = await localApi<{ requestId: string; sourceHash: string; suggestion: string }>('cleanup', { requestId, scope, scopeKind, source, model, text: snapshot.text }, controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      if (!revision.current(snapshot, text.current) || workspace !== getWorkspaceReference() || result.requestId !== requestId) { setStatus('Cleanup suggestion discarded because the message or destination changed. Your edits are safe.'); return; }
      previousCleanupApplied.current = cleanupApplied; revision.applied(snapshot.text, result.suggestion); text.current = result.suggestion; changed.current(result.suggestion); setCleanupApplied(true);
      setStatus('Cleanup applied. Review names, numbers and meaning before sending. Undo is available until your next edit.');
    } catch { if (mounted.current && !controller.signal.aborted) setStatus('Cleanup failed. Your original text is safe. Configure the selected credential in Settings; no automatic retry was attempted.'); }
    finally { if (abort.current === controller) { abort.current = null; if (mounted.current) setCleaning(false); } }
  }
  const capturing = ['requesting', 'listening', 'finishing'].includes(dictation.state);
  return <div className="kr-composer" onKeyDown={event => { if (event.key === 'Escape') { dictation.invalidate(); cancelCleanup(); setStatus('Dictation and cleanup canceled. Confirmed text retained.'); } }}><label className="kr-field">{label}<textarea ref={textarea} value={value} rows={5} maxLength={limit} onChange={event => { text.current = event.target.value; revision.edit(); changed.current(event.target.value); }} /></label><div className="kr-toolbar kr-composer-actions"><AppButton static disabled={!capturing && (disabled || dictation.state === 'unavailable')} onClick={() => { if (capturing) dictation.stop(); else { cancelCleanup(); dictation.start(); } }}>{capturing ? 'Stop dictation' : 'Dictate'}</AppButton><AppButton static disabled={disabled || cleanupDisabled || cleaning || !value.trim() || value.length > 20000} onClick={() => void cleanup()}>Clean up</AppButton>{action}{cleaning && <AppButton static onClick={() => { cancelCleanup(); setStatus('Cleanup canceled. Your original text is safe.'); }}>Cancel cleanup</AppButton>}{revision.undo && revision.canUndo(value) && <AppButton static onClick={() => { const original = revision.undo!.original; revision.edit(); text.current = original; changed.current(original); setCleanupApplied(previousCleanupApplied.current); setStatus('Original text restored.'); }}>Undo cleanup</AppButton>}</div><p className="kr-composer-note">Optional Clean up uses the selected model and may incur API charges (20,000 characters maximum). Dictation uses your browser’s speech service, which may process audio remotely. Kessel Run stores no audio.</p><p role="status">{capturing ? dictation.state === 'requesting' ? 'Requesting microphone permission…' : dictation.state === 'finishing' ? 'Finishing dictation…' : 'Listening. You can keep typing.' : dictation.hint || 'Ready to type or dictate.'}</p>{status && <p role="status">{status}</p>}{capturing && dictation.hint.startsWith('Hearing:') && <p aria-hidden="true">{dictation.hint}</p>}{dictation.recovery && <div><label className="kr-field">Unsaved recognition fragment<textarea readOnly value={dictation.recovery} rows={3} /></label><AppButton static onClick={() => dictation.dismissRecovery()}>Dismiss recovered fragment</AppButton></div>}{revision.undo && !revision.canUndo(value) && <details><summary>Original before cleanup (copy to compare)</summary><textarea aria-label="Original before cleanup" readOnly value={revision.undo.original} rows={3} /></details>}</div>;
}
