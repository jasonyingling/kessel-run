import { z } from 'zod';
import { operationState } from './operation-state';
import { ownsStudioCommand } from './studio-ownership';
const draftSchema = z.object({ publicationId: z.string().uuid(), title: z.string().max(160), brief: z.string().max(80000), mode: z.enum(['guided', 'fast']), preset: z.string(), voice: z.string(), author: z.string(), piece: z.object({ id: z.string().uuid(), link: z.string() }).nullable(), output: z.object({ id: z.string().uuid(), link: z.string() }).optional(), target: z.enum(['idea', 'output', 'voice']).optional() }).strict();
export type CreationDraft = z.infer<typeof draftSchema>;
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function creationState(storage: Storage, scope: string) {
  const key = `kr-creation:${scope}`, commands = operationState(storage, `${scope}:command`);
  return {
    commands,
    read() { const raw = storage.getItem(key); if (!raw) return null; return draftSchema.parse(JSON.parse(raw)); },
    write(draft: CreationDraft) { storage.setItem(key, JSON.stringify(draftSchema.parse(draft))); },
    clear() { storage.removeItem(key); },
    async step(action: string, input: Record<string, unknown>, active: () => boolean, request: (body: unknown) => Promise<{ id: string; link: string }>, acknowledge: (result: { id: string; link: string }) => void) {
      const command = commands.read() ?? commands.begin({ path: 'content', body: { action, input: { ...input, operationId: crypto.randomUUID() } } });
      try {
        const result = await request(command.body);
        if (!active() || !ownsStudioCommand(true, commands.read(), command)) return null;
        acknowledge(result); // Retain the returned identity before clearing its exact command.
        commands.clear(); return result;
      } catch (error) {
        if (active() && ownsStudioCommand(true, commands.read(), command)) commands.failed(error);
        throw error;
      }
    },
  };
}
