import type { PendingOperation } from './operation-state';
/** Late completions may only acknowledge the exact command of a still-mounted owner. */
export function ownsStudioCommand(active: boolean, current: PendingOperation | null, submitted: PendingOperation) {
  return active && current?.path === submitted.path && JSON.stringify(current.body) === JSON.stringify(submitted.body);
}
export function studioLifetime() {
  let active = true;
  return { active: () => active, dispose: () => { active = false; } };
}
