/** App-supported choices; account availability is discovered on the server. */
export const modelChoices = [
  { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol' },
  { id: 'gpt-6-luna', label: 'GPT-6 Luna' },
] as const;
export const supportedModels = ['gpt-6.1-sol', 'gpt-6-luna'] as const;
export type ModelAvailability = { id: string; label: string; available: boolean | null };
export type ModelCatalog = { models: ModelAvailability[]; message: string; checked: boolean };
