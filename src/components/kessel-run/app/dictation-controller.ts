export type DictationState = 'ready' | 'requesting' | 'listening' | 'finishing' | 'error' | 'unavailable';
export type RecognitionEvent = { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
export interface Recognition {
  continuous: boolean; interimResults: boolean; lang: string;
  onstart: (() => void) | null; onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  start(): void; stop(): void; abort(): void;
}
export function browserSpeechAvailable() {
  const host = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return typeof host.SpeechRecognition === 'function' || typeof host.webkitSpeechRecognition === 'function';
}
export function browserRecognition(): Recognition | null {
  const host = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Constructor = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  return Constructor ? new Constructor() : null;
}
/** All callbacks are session-bound; invalidation happens before any abort callback. */
export class DictationController {
  private session = 0;
  private capabilityUnavailable = false;
  private recognition: Recognition | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  state: DictationState = 'ready';
  hint = '';
  recovery = '';
  recognizedText = '';
  constructor(private options: { factory: () => Recognition | null; append: (text: string) => boolean; changed: () => void; limit: number; finishMs?: number }) {}
  private update(state: DictationState, hint = '') { this.state = state; this.hint = hint; this.options.changed(); }
  start() {
    if (this.recovery) { this.update('error', 'Recover or dismiss the unsaved fragment before restarting dictation.'); return; }
    this.invalidate();
    const id = ++this.session;
    const seen = new Set<number>();
    let instance: Recognition | null;
    try { instance = this.options.factory(); } catch { this.update('error', 'Speech recognition could not start. Your text is safe.'); return; }
    if (!instance) { this.update('unavailable', 'Speech recognition is unavailable here. You can still type.'); return; }
    this.recognition = instance;
    const current = () => id === this.session;
    instance.continuous = true; instance.interimResults = true; instance.lang = typeof document !== 'undefined' ? document.documentElement.lang || navigator.language || 'en-US' : 'en-US';
    instance.onstart = () => { if (!current() || this.state !== 'requesting') { instance.abort(); return; } this.update('listening', 'Listening. You can keep typing.'); };
    instance.onend = () => { if (current()) { this.invalidate(); this.update('ready', 'Dictation stopped. Confirmed text retained.'); } };
    instance.onerror = event => { if (current()) { this.invalidate(); this.update('error', `Dictation stopped (${['not-allowed', 'no-speech', 'network', 'audio-capture', 'aborted'].includes(event.error) ? event.error : 'recognition error'}). Your text is safe.`); } };
    instance.onresult = event => {
      if (!current()) return;
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        if (!result.isFinal) { interim += result[0].transcript; continue; }
        if (seen.has(index)) continue; seen.add(index);
        const text = result[0].transcript;
        if (this.recognizedText.length + text.length > this.options.limit || !this.options.append(text)) {
          let recoverable = text;
          for (let remaining = index + 1; remaining < event.results.length; remaining++) {
            if (event.results[remaining].isFinal && !seen.has(remaining)) { seen.add(remaining); recoverable += event.results[remaining][0].transcript; }
          }
          this.recovery = recoverable.slice(0, 80000); this.invalidate();
          this.update('error', `Text limit reached. Dictation stopped; recover the unsaved fragment below.${recoverable.length > 80000 ? ' Recovery capped at 80,000 characters; remaining recognition was not retained.' : ''}`); return;
        }
        this.recognizedText += text;
      }
      if (current()) { this.hint = interim ? `Hearing: ${interim.slice(0, 240)}` : 'Listening. Confirmed words are in your message.'; this.options.changed(); }
    };
    this.update('requesting', 'Requesting microphone permission…');
    try { instance.start(); } catch { if (current()) { this.invalidate(); this.update('error', 'Speech recognition could not start. Your text is safe.'); } }
  }
  unavailable() { this.capabilityUnavailable = true; this.update('unavailable', 'Speech recognition is unavailable here. You can still type.'); }
  dismissRecovery() { this.recovery = ''; this.update('ready'); }
  stop() {
    if (!this.recognition || this.state === 'finishing') return;
    this.update('finishing', 'Finishing dictation…');
    try { this.recognition.stop(); } catch { this.invalidate(); this.update('error', 'Dictation stopped. Confirmed text retained.'); return; }
    if (!this.recognition) return;
    this.timer = setTimeout(() => { this.invalidate(); this.update('ready', 'Dictation timed out. Confirmed text retained.'); }, this.options.finishMs ?? 1500);
  }
  invalidate() {
    ++this.session; clearTimeout(this.timer); this.timer = undefined;
    const previous = this.recognition; this.recognition = null;
    try { previous?.abort(); } catch { /* Text does not depend on provider abort. */ }
    this.state = this.capabilityUnavailable ? 'unavailable' : 'ready';
    this.hint = this.capabilityUnavailable ? 'Speech recognition is unavailable here. You can still type.' : ''; this.options.changed();
  }
}
