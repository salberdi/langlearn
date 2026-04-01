'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('Reader');
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

    // Don't replace the DOM while the user has text selected inside this container.
    // On Android, the vocab fetch completes while the user is mid-selection, triggering
    // a re-injection that detaches selection anchor nodes and makes insideChunk = false.
    const existingSel = window.getSelection();
    if (existingSel && !existingSel.isCollapsed) {
      if (
        container.contains(existingSel.anchorNode) ||
        container.contains(existingSel.focusNode)
      ) {
        return;
      }
    }

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

  }, [translatedHtml, tokensJson, studyLang, isRtl]);

  useEffect(() => {
    injectWordSpans();
  }, [injectWordSpans]);

  // Apply vocab highlighting without replacing the DOM (so active selections are preserved).
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !vocabStatuses) return;
    const wordSpans = container.querySelectorAll('[data-word]');
    wordSpans.forEach((span) => {
      span.classList.remove('word-new', 'word-learning');
      const word = span.getAttribute('data-word') ?? '';
      const status = vocabStatuses[word.toLowerCase()];
      if (status === 'new') {
        span.classList.add('word-new');
      } else if (status === 'learning') {
        span.classList.add('word-learning');
      }
    });
  }, [vocabStatuses]);

  // Track text selection via selectionchange — the only event that fires reliably
  // on Android Chrome during native text selection (touchend/pointerup get cancelled).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let clearTimer: ReturnType<typeof setTimeout> | null = null;

    function handleSelectionChange() {
      const selection = window.getSelection();

      if (!selection || selection.isCollapsed) {
        // On iOS, the selection briefly collapses when the user lifts their finger
        // before the selection handles stabilize. Debounce the clear to avoid
        // the button flickering away before the user can tap it.
        if (clearTimer) clearTimeout(clearTimer);
        clearTimer = setTimeout(() => {
          clearTimer = null;
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed || sel.toString().trim().length === 0) {
            setPendingSelection(null);
          }
        }, 300);
        return;
      }

      if (clearTimer) {
        clearTimeout(clearTimer);
        clearTimer = null;
      }

      const text = selection.toString().trim();
      if (text.length === 0) {
        setPendingSelection(null);
        return;
      }

      // Only show button if selection overlaps this chunk.
      // Use intersectsNode because on Android Chrome, highlighting across spans
      // often snaps anchorNode/focusNode to document.body, bypassing .contains().
      if (selection.rangeCount === 0) {
        setPendingSelection(null);
        return;
      }
      
      const range = selection.getRangeAt(0);
      const insideChunk = range.intersectsNode(container!);
      if (!insideChunk) {
        setPendingSelection(null);
        return;
      }

      const anchorNode = selection.anchorNode;
      let context = text;
      
      if (anchorNode && container!.contains(anchorNode)) {
        const parentEl =
          anchorNode.nodeType === Node.TEXT_NODE
            ? anchorNode.parentElement
            : (anchorNode as HTMLElement);
        const paragraph = parentEl?.closest('p, div, blockquote, h1, h2, h3, h4, h5, h6');
        if (paragraph && container!.contains(paragraph)) {
          context = paragraph.textContent?.trim() ?? text;
        }
      }

      setPendingSelection({ text, context });
    }

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (clearTimer) clearTimeout(clearTimer);
    };
  }, []);

  // Capture the selection on pointerdown so we have it even if the tap
  // triggers a selectionchange that clears pendingSelection before onClick fires.
  const capturedSelectionRef = useRef<PendingSelection | null>(null);

  function handleAnalyzePointerDown() {
    capturedSelectionRef.current = pendingSelection;
  }

  function handleAnalyzeClick() {
    const captured = capturedSelectionRef.current ?? pendingSelection;
    capturedSelectionRef.current = null;
    if (!captured) return;
    const { text, context } = captured;
    setPendingSelection(null);
    window.getSelection()?.removeAllRanges();
    onPhraseSelect(text, studyLang, context);
  }

  const analyzeText = pendingSelection
    ? pendingSelection.text.length > 50
      ? pendingSelection.text.slice(0, 50) + '…'
      : pendingSelection.text
    : '';

  return (
    <>
      <div
        ref={containerRef}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="chunk-content prose prose-lg max-w-none"
        style={{ lineHeight: 1.8, touchAction: 'auto', userSelect: 'text', WebkitUserSelect: 'text' }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const wordSpan = target.closest('[data-word]');
          if (wordSpan) {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) return;
            const range = document.createRange();
            range.selectNodeContents(wordSpan);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }}
      />
      {pendingSelection && (
        <button
          onPointerDown={handleAnalyzePointerDown}
          onClick={handleAnalyzeClick}
          className="fixed bottom-6 left-4 right-4 bg-blue-600 text-white py-3 rounded-xl shadow-lg text-sm font-medium z-[999] active:bg-blue-700"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          {t('analyze', { text: analyzeText })}
        </button>
      )}
    </>
  );
}
