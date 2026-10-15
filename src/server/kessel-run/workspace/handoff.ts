import { z } from 'zod';
import { hashText } from './files';
export const handoffBundle = z.object({
  format: z.literal('kessel-run-handoff-v1'), outputId: z.string().uuid(),
  files: z.array(z.object({ path: z.string().min(1).max(1024), text: z.string().max(800000) }).strict()).min(1).max(1000),
}).strict();
export type HandoffBundle = z.infer<typeof handoffBundle>;
export function parseHandoff(markdown: string) {
  const marker = '\n```kessel-run-handoff\n';
  const start = markdown.lastIndexOf(marker);
  if (start < 0) throw new Error('No Kessel Run restoration block was supplied');
  const rest = markdown.slice(start + marker.length);
  const end = rest.indexOf('\n```');
  if (end < 0) throw new Error('Restoration block is incomplete');
  return handoffBundle.parse(JSON.parse(rest.slice(0, end)));
}
export function handoffHash(bundle: HandoffBundle) { return hashText(JSON.stringify(handoffBundle.parse(bundle))); }
