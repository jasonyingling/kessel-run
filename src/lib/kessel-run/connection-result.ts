export function connectionFailure(run: { status: string; candidateId?: string | null; failure?: string | null; usage?: unknown }) {
  if (run.status === 'completed' && run.candidateId) return null;
  if (run.status === 'interrupted' || run.failure === 'canceled') return 'The connection check was stopped or timed out. Try again when ready.';
  if (run.failure === 'output-limit') return 'The model reached the test output limit before saving. Your key connected, but the writing check did not finish.';
  if (run.failure === 'no-candidate' || run.usage) return 'OpenAI responded, but the model did not finish saving the test sentence. This does not mean your API key is invalid.';
  return 'The connection check failed. Check the selected key, model access and API billing, then try again.';
}
