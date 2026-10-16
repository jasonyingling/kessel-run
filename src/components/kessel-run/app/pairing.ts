import { LocalApiError, localApi } from '@/lib/kessel-run/local-api';
let pairing: Promise<void> | null = null;
let listening = false;
export function pairFromLauncher() {
  if (!listening) {
    listening = true;
    // Opening a fresh launcher fragment on an already open /kessel-run page is
    // a same-document navigation. Restart initialization to exchange that token.
    window.addEventListener('hashchange', () => {
      if (new URLSearchParams(window.location.hash.slice(1)).has('pair')) window.location.reload();
    });
  }
  const token = new URLSearchParams(window.location.hash.slice(1)).get('pair');
  if (token) {
    // Remove immediately, before network work, including old settings links.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    pairing = localApi('pair', { token }).then(() => undefined).catch(() => {
      throw new LocalApiError(401, 'PAIR_REQUIRED', 'This link expired or was already used. Restart the local launcher and open its new browser link.');
    });
  }
  return pairing ?? Promise.resolve();
}
