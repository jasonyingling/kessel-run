export type StarterPreferences = { reader: string; tone: string; phrases: string; rules: string };
export const emptyPreferences: StarterPreferences = { reader: '', tone: '', phrases: '', rules: '' };
/** Headings organize supplied words; no unanswered field contributes a rule. */
export function starterVoice(preferences: StarterPreferences) {
  const headings: Record<keyof StarterPreferences, string> = { reader: 'Reader experience', tone: 'Tone and opinion', phrases: 'Phrases to use or avoid', rules: 'Other preferences' };
  return (Object.keys(headings) as (keyof StarterPreferences)[]).filter(key => preferences[key].trim()).map(key => `## ${headings[key]}\n\n${preferences[key]}`).join('\n\n');
}
