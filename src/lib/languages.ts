export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  'es-MX': 'Mexican Spanish',
  'es-AR': 'Argentine Spanish',
  'es-ES': 'Castilian Spanish',
  fr: 'French',
  'fr-CA': 'Canadian French',
  de: 'German',
  'de-AT': 'Austrian German',
  'de-CH': 'Swiss German',
  it: 'Italian',
  pt: 'Portuguese',
  'pt-BR': 'Brazilian Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  zh: 'Chinese',
  'zh-CN': 'Simplified Chinese',
  'zh-TW': 'Traditional Chinese',
  ko: 'Korean',
  ar: 'Arabic',
  'ar-EG': 'Egyptian Arabic',
  'ar-SA': 'Saudi Arabic',
  hi: 'Hindi',
  tr: 'Turkish',
  pl: 'Polish',
  nl: 'Dutch',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
  el: 'Greek',
  he: 'Hebrew',
  th: 'Thai',
  vi: 'Vietnamese',
  uk: 'Ukrainian',
  cs: 'Czech',
  ro: 'Romanian',
  hu: 'Hungarian',
  id: 'Indonesian',
  ms: 'Malay',
  tl: 'Tagalog',
  sw: 'Swahili',
  la: 'Latin',
};

export const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur', 'yi']);

export function isRtl(lang: string): boolean {
  const base = lang.split('-')[0];
  return RTL_LANGS.has(base);
}

export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? LANGUAGE_NAMES[code.split('-')[0]] ?? code;
}

export function isCJK(lang: string): boolean {
  const base = lang.split('-')[0];
  return ['ja', 'zh', 'ko'].includes(base);
}
