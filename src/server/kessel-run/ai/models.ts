import { z } from 'zod';
import { modelChoices, type ModelCatalog } from '@/lib/kessel-run/models';
import { Credentials, type CredentialSource } from './credentials';

export async function discoverModels(source?: CredentialSource, signal?: AbortSignal, dependencies: { credentials?: Credentials; fetch?: typeof fetch } = {}): Promise<ModelCatalog> {
  const result = (available: boolean | null, message: string): ModelCatalog => ({ models: modelChoices.map(model => ({ ...model, available })), message, checked: false });
  if (!source) return result(null, 'Choose an API key source to check model access.');
  let key: string;
  try { key = await (dependencies.credentials ?? new Credentials()).resolve(source); }
  catch { return result(false, 'No key is configured for this source. Add a key or select the configured source.'); }
  try {
    const response = await (dependencies.fetch ?? fetch)('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` }, cache: 'no-store', redirect: 'error',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
    });
    if (!response.ok) return result(false, response.status === 401 ? 'OpenAI did not accept this key. Replace it in Settings.' : response.status === 403 ? 'This key cannot list models. Check its project permissions.' : 'Model access could not be checked. Try refreshing the model list.');
    const body = z.object({ data: z.array(z.object({ id: z.string() })) }).parse(await response.json());
    const ids = new Set(body.data.map(model => model.id));
    return { models: modelChoices.map(model => ({ ...model, available: ids.has(model.id) })), checked: true, message: 'Model access checked with OpenAI. A connection test verifies generation and saving separately.' };
  } catch { return result(false, 'Model access could not be checked. Try refreshing the model list.'); }
}
