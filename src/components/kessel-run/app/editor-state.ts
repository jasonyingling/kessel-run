export function acknowledgeSave(submitted: string, current: string, savedHash: string, savedContextHash: string) {
  return { prose: current, dirty: current !== submitted, baseHash: savedHash, contextHash: savedContextHash };
}

export type ExportIdentity = { revision: unknown; hash: string; contextHash: string };
export function canExportBuffer(submitted: string, current: string, saved: ExportIdentity, exported: ExportIdentity) {
  return submitted === current && saved.revision === exported.revision && saved.hash === exported.hash && saved.contextHash === exported.contextHash;
}
export function parseEditorRecovery(raw: string | null): { prose: string; hash: string; contextHash: string } | null {
  if (!raw) return null;
  const value = JSON.parse(raw);
  return value && typeof value.prose === 'string' && value.prose.length <= 80000 && /^[a-f0-9]{64}$/.test(value.hash) && /^[a-f0-9]{64}$/.test(value.contextHash) ? value : null;
}
