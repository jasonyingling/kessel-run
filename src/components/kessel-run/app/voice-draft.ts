import { z } from 'zod';
const bounded = z.string().max(80000);
export const voiceDraft = z.object({
  mode: z.enum(['starter', 'import', 'author']).nullable(), title: z.string().max(160), prose: bounded,
  provenance: z.string().max(12000),
  preferences: z.object({ reader: z.string().max(18000), tone: z.string().max(18000), phrases: z.string().max(18000), rules: z.string().max(18000) }).strict(),
  parent: z.string().refine(value => !value || /^[a-f\d-]{36}:[1-9]\d*$/.test(value)),
  authorId: z.union([z.string().uuid(), z.literal('')]),
  preview: z.object({ publicationHash: z.string().length(64) }).strict().nullable(),
}).strict();
export type VoiceDraft = z.infer<typeof voiceDraft>;
