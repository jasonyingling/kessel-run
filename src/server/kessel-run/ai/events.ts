import { z } from 'zod';
export const runEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), sequence: z.number().int(), text: z.string() }).strict(),
  z.object({ type: z.literal('operation'), sequence: z.number().int(), name: z.string(), result: z.unknown() }).strict(),
  z.object({ type: z.literal('terminal'), sequence: z.number().int(), status: z.enum(['completed', 'interrupted', 'failed']) }).strict(),
]);
export type RunEvent = z.infer<typeof runEvent>;
