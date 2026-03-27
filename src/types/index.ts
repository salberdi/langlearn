export type TranslationStatus = 'pending' | 'in_progress' | 'complete' | 'error';
export type VocabStatus = 'new' | 'learning' | 'known' | 'ignored';
export type SRSMode = 'recognition' | 'cloze';
export type SRSQuality = 0 | 1 | 2 | 3 | 4 | 5;

export interface ServerToken {
  surface: string;
  lookup: string;
  reading?: string;
  isWord: boolean;
  startOffset: number;
}

export interface ClientToken {
  surface: string;
  lookup: string;
  reading?: string;
  isWord: boolean;
  startOffset: number;
}

export interface ParsedBook {
  title: string;
  author: string;
  chapters: Array<{ title: string; html: string }>;
  drmDetected: boolean;
}

export interface AnalysisField {
  translation?: string;
  pronunciation?: string;
  grammar?: string;
  register?: string;
  frequency?: string;
  mnemonic?: string;
  examples?: Array<{ sentence: string; translation: string }>;
}

export interface TranslateResult {
  translatedHtml: string;
  tokensJson: string | null;
}
