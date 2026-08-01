/**
 * Resource identity for Mastra memory.
 *
 * This app has no authentication yet, so every request resolves to the same
 * single-user resource. Mastra scopes threads and working memory by
 * `resourceId`, so when auth is added, this is the only place that needs to
 * change — every route and store call already goes through it.
 */
const SINGLE_USER_RESOURCE_ID = 'kessel-run-local-user'

export async function getResourceId(): Promise<string> {
  return SINGLE_USER_RESOURCE_ID
}
