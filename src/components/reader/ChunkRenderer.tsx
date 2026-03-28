'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import DOMPurify from 'dompurify';
import { tokenizeLatin, tokensFromPrecomputed } from '@/lib/tokenizer-client';
import { isCJK } from '@/lib/languages';

interface ChunkRendererProps {
  translatedHtml: string;
  tokensJson: string | null;
  studyLang: string;
  isRtl: boolean;
  vocabStatuses?: Record<string, string>;
  onPhraseSelect: (phrase: string, lang: string, context: string) => void;
}

interface PendingSelection {
  text: string;
  context: string;
}

export default function ChunkRenderer({
  translatedHtml,
  tokensJson,
  studyLang,
  isRtl,
  vocabStatuses,
  onPhraseSelect,
}: ChunkRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);

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

  // Track text selection via selectionchange — the only event that fires reliably
  // on Android Chrome during native text selection (touchend/pointerup get cancelled).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleSelectionChange() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setPendingSelection(null);
        return;
      }

      const text = selection.toString().trim();
      if (text.length === 0) {
        setPendingSelection(null);
        return;
      }

      // Only show button if selection is inside this chunk
      if (!container!.contains(selection.anchorNode)) {
        setPendingSelection(null);
        return;
      }

      const anchorNode = selection.anchorNode;
      const parentEl =
        anchorNode?.nodeType === Node.TEXT_NODE
          ? anchorNode.parentElement
          : (anchorNode as HTMLElement);
      const paragraph = parentEl?.closest('p, div, blockquote, h1, h2, h3, h4, h5, h6');
      const context = paragraph?.textContent?.trim() ?? text;

      setPendingSelection({ text, context });
    }

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  function handleAnalyzeClick() {
    if (!pendingSelection) return;
    const { text, context } = pendingSelection;
    setPendingSelection(null);
    window.getSelection()?.removeAllRanges();
    onPhraseSelect(text, studyLang, context);
  }

  return (
    <>
      <div
        ref={containerRef}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="chunk-content prose prose-lg max-w-none"
        style={{ lineHeight: 1.8, touchAction: 'auto', userSelect: 'text', WebkitUserSelect: 'text' }}
      />
      {pendingSelection && (
        <button
          onClick={handleAnalyzeClick}
          className="fixed bottom-6 left-4 right-4 bg-blue-600 text-white py-3 rounded-xl shadow-lg text-sm font-medium z-40 active:bg-blue-700"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          Analyze: &ldquo;{pendingSelection.text.length > 50
            ? pendingSelection.text.slice(0, 50) + '…'
            : pendingSelection.text}&rdquo;
        </button>
      )}
    </>
  );
}
