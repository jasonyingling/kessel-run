export function acknowledgeSave(submitted: string, current: string, savedHash: string, savedContextHash: string) {
  return { prose: current, dirty: current !== submitted, baseHash: savedHash, contextHash: savedContextHash };
}
