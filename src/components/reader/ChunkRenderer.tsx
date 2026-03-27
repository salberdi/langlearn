'use client';

import { useRef, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { tokenizeLatin, tokensFromPrecomputed } from '@/lib/tokenizer-client';
import { isCJK } from '@/lib/languages';

interface ChunkRendererProps {
  translatedHtml: string;
  tokensJson: string | null;
  studyLang: string;
  isRtl: boolean;
  vocabStatuses?: Record<string, string>;
  onWordTap: (word: string, lang: string) => void;
  onPhraseSelect: (phrase: string, lang: string, context: string) => void;
}

export default function ChunkRenderer({
  translatedHtml,
  tokensJson,
  studyLang,
  isRtl,
  vocabStatuses,
  onWordTap,
  onPhraseSelect,
}: ChunkRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const injectWordSpans = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const sanitized = DOMPurify.sanitize(translatedHtml, {
      ALLOWED_TAGS: [
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'em', 'strong', 'blockquote', 'br', 'hr', 'span', 'div',
        'ruby', 'rt',
      ],
      ALLOWED_ATTR: [],
    });

    container.innerHTML = sanitized;

    const useCJK = isCJK(studyLang) && tokensJson;
    const precomputed = useCJK ? tokensFromPrecomputed(tokensJson!) : null;

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      if (node.textContent?.trim()) {
        textNodes.push(node);
      }
    }

    if (precomputed) {
      // CJK: use pre-computed tokens
      let tokenIdx = 0;
      for (const textNode of textNodes) {
        const text = textNode.textContent ?? '';
        const frag = document.createDocumentFragment();
        let consumed = 0;

        while (consumed < text.length && tokenIdx < precomputed.length) {
          const token = precomputed[tokenIdx];
          const remaining = text.slice(consumed);

          if (remaining.startsWith(token.surface)) {
            if (token.isWord) {
              const span = document.createElement('span');
              span.setAttribute('data-word', token.lookup);
              span.setAttribute('data-lang', studyLang);
              if (isRtl) {
                span.style.unicodeBidi = 'isolate';
              }

              // Ruby for CJK with reading
              if (token.reading && studyLang.startsWith('ja')) {
                const ruby = document.createElement('ruby');
                ruby.textContent = token.surface;
                const rt = document.createElement('rt');
                rt.textContent = token.reading;
                ruby.appendChild(rt);
                span.appendChild(ruby);
              } else {
                span.textContent = token.surface;
              }
              frag.appendChild(span);
            } else {
              frag.appendChild(document.createTextNode(token.surface));
            }
            consumed += token.surface.length;
            tokenIdx++;
          } else {
            // Gap character not in tokens
            frag.appendChild(document.createTextNode(remaining[0]));
            consumed++;
          }
        }

        // Remaining text
        if (consumed < text.length) {
          frag.appendChild(document.createTextNode(text.slice(consumed)));
        }

        textNode.parentNode?.replaceChild(frag, textNode);
      }
    } else {
      // Latin/Arabic/Hebrew: use Intl.Segmenter
      for (const textNode of textNodes) {
        const text = textNode.textContent ?? '';
        const tokens = tokenizeLatin(text);
        const frag = document.createDocumentFragment();

        for (const token of tokens) {
          if (token.isWord) {
            const span = document.createElement('span');
            span.setAttribute('data-word', token.lookup);
            span.setAttribute('data-lang', studyLang);
            span.textContent = token.surface;
            if (isRtl) {
              span.style.unicodeBidi = 'isolate';
            }
            frag.appendChild(span);
          } else {
            frag.appendChild(document.createTextNode(token.surface));
          }
        }

        textNode.parentNode?.replaceChild(frag, textNode);
      }
    }

    // Apply vocab highlighting
    if (vocabStatuses) {
      const wordSpans = container.querySelectorAll('[data-word]');
      wordSpans.forEach((span) => {
        const word = span.getAttribute('data-word') ?? '';
        const status = vocabStatuses[word.toLowerCase()];
        if (status === 'new') {
          span.classList.add('word-new');
        } else if (status === 'learning') {
          span.classList.add('word-learning');
        }
      });
    }
  }, [translatedHtml, tokensJson, studyLang, isRtl, vocabStatuses]);

  useEffect(() => {
    injectWordSpans();
  }, [injectWordSpans]);

  // Handle word taps
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const wordSpan = target.closest('[data-word]');
      if (wordSpan) {
        const word = wordSpan.getAttribute('data-word') ?? '';
        const lang = wordSpan.getAttribute('data-lang') ?? studyLang;
        onWordTap(word, lang);
      }
    }

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [studyLang, onWordTap]);

  // Handle phrase selection (300ms debounce)
  useEffect(() => {
    function handleSelectionChange() {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      selectionTimeoutRef.current = setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const text = selection.toString().trim();
        if (text.length < 2 || text.split(/\s+/).length < 2) return;

        // Extract containing sentence as context
        const anchorNode = selection.anchorNode;
        const parentEl =
          anchorNode?.nodeType === Node.TEXT_NODE
            ? anchorNode.parentElement
            : (anchorNode as HTMLElement);
        const paragraph = parentEl?.closest('p, div, blockquote, h1, h2, h3, h4, h5, h6');
        const context = paragraph?.textContent?.trim() ?? text;

        onPhraseSelect(text, studyLang, context);
      }, 300);
    }

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [studyLang, onPhraseSelect]);

  return (
    <div
      ref={containerRef}
      dir={isRtl ? 'rtl' : 'ltr'}
      className="chunk-content prose prose-lg max-w-none touch-pan-y"
      style={{ lineHeight: 1.8 }}
    />
  );
}
