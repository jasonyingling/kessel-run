type HandoffFile = Pick<File, 'name' | 'size' | 'text'>;
export type ReviewedHandoff<T> = Readonly<{
  generation: number;
  filename: string;
  markdown: string;
  workspaceHash: string;
  previewHash: string;
  preview: T;
}>;
type Selection<T> = {
  generation: number;
  filename: string;
  phase: 'empty' | 'reading' | 'ready' | 'error';
  markdown: string;
  inspecting: boolean;
  review: ReviewedHandoff<T> | null;
  message: string;
};
const initialMessage = 'Restoration preserves exported editorial records. Choose a new empty workspace first.';

/** One selection owns every read, preview and confirmation derived from its contents. */
export class HandoffSelection<T extends { hash: string }> {
  private state: Selection<T> = { generation: 0, filename: '', phase: 'empty', markdown: '', inspecting: false, review: null, message: initialMessage };
  private listeners = new Set<() => void>();
  private previewRequest = 0;
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private update(patch: Partial<Selection<T>>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  async select(file?: HandoffFile) {
    const generation = this.state.generation + 1;
    this.previewRequest++;
    this.update({ generation, filename: file?.name ?? '', phase: file ? 'reading' : 'empty', markdown: '', review: null, inspecting: false, message: file ? `Reading ${file.name}…` : 'No file selected.' });
    if (!file) return;
    if (!/\.md$/i.test(file.name) || file.size === 0 || file.size > 8_000_000) {
      this.update({ phase: 'error', message: 'Choose a nonempty Markdown (.md) handoff no larger than 8 MB.' });
      return;
    }
    try {
      const markdown = await file.text();
      if (this.state.generation !== generation) return;
      if (!markdown.trim()) {
        this.update({ phase: 'error', message: 'This file is empty. Choose a Markdown handoff with content.' });
        return;
      }
      this.update({ markdown, phase: 'ready', message: `${file.name} is ready to preview.` });
    } catch {
      if (this.state.generation === generation) this.update({ phase: 'error', message: `${file.name} could not be read. Choose the file again.` });
    }
  }
  async inspect(workspaceHash: string, preview: (markdown: string) => Promise<T>) {
    if (this.state.phase !== 'ready' || this.state.inspecting) return;
    const { generation, filename, markdown } = this.state;
    const request = ++this.previewRequest;
    this.update({ inspecting: true, review: null, message: `Preparing preview of ${filename}…` });
    try {
      const result = await preview(markdown);
      if (this.state.generation !== generation || request !== this.previewRequest) return;
      this.update({ review: Object.freeze({ generation, filename, markdown, workspaceHash, previewHash: result.hash, preview: result }), message: 'Review exact prose, profile versions and prior editorial decisions before restoring.' });
    } catch (error) {
      if (this.state.generation === generation && request === this.previewRequest) this.update({ message: error instanceof Error ? error.message : 'Preview failed.' });
    } finally {
      if (this.state.generation === generation && request === this.previewRequest) this.update({ inspecting: false });
    }
  }
  confirmation(workspaceHash: string) {
    const { review, generation, phase, inspecting } = this.state;
    return phase === 'ready' && !inspecting && review?.generation === generation && review.workspaceHash === workspaceHash ? review : null;
  }
  restored(review: ReviewedHandoff<T>) {
    if (this.state.review !== review) return;
    this.update({ generation: this.state.generation + 1, filename: '', phase: 'empty', markdown: '', review: null, message: 'Restored into the selected empty workspace.' });
  }
  restoreFailed(review: ReviewedHandoff<T>, error: unknown) {
    if (this.state.review === review) this.update({ message: error instanceof Error ? error.message : 'Restoration failed.' });
  }
}
