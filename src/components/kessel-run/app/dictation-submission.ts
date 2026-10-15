/** A successful HTTP stream can still contain a failed or interrupted turn. */
export function completedUnchangedSubmission(terminal: string | undefined, submittedScope: string, currentScope: string, submitted: string, current: string) {
  return terminal === 'completed' && submittedScope === currentScope && submitted === current;
}
