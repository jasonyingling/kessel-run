/** Edits are generations: edit then undo still invalidates an in-flight response. */
export class CleanupRevision {
  revision = 0;
  request = 0;
  undo: { original: string; cleaned: string; revision: number } | null = null;
  edit() { ++this.revision; }
  snapshot(text: string) { return { text, revision: this.revision, request: ++this.request }; }
  cancel() { ++this.request; }
  current(snapshot: { text: string; revision: number; request: number }, text: string) { return snapshot.request === this.request && snapshot.revision === this.revision && snapshot.text === text; }
  applied(original: string, cleaned: string) { this.edit(); this.undo = { original, cleaned, revision: this.revision }; }
  canUndo(text: string) { return this.undo?.revision === this.revision && this.undo.cleaned === text; }
}
