export const MODELS = {
  TRANSLATION: 'claude-sonnet-4-6',
  PHRASE_ANALYSIS: 'claude-sonnet-4-6',
  WORD_DEFINITION: 'claude-haiku-4-5',
  TM_EXTRACTION: 'claude-haiku-4-5',
  LANG_DETECTION: 'claude-haiku-4-5',
} as const;

export type ModelKey = keyof typeof MODELS;
