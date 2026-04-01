'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function SidePanel({ open, onClose, children }: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Swipe-down to close on mobile bottom sheet
  const handleTouchStart = useCallback((e: TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    currentYRef.current = e.touches[0].clientY;
    const delta = currentYRef.current - startYRef.current;
    if (delta > 0 && panelRef.current) {
      panelRef.current.style.transform = `translateY(${delta}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const delta = currentYRef.current - startYRef.current;
    if (delta > 100) {
      onClose();
    }
    if (panelRef.current) {
      panelRef.current.style.transform = '';
    }
  }, [onClose]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el || !open) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [open, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Mobile: bottom sheet with backdrop */}
      <div className={`md:hidden ${open ? '' : 'pointer-events-none'}`}>
        <div
          className={`fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px] transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />
        <div
          ref={panelRef}
          className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto transition-transform duration-300 ${
            open ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-9 h-1 bg-slate-200 rounded-full" />
          </div>
          <div className="px-5 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
            {children}
          </div>
        </div>
      </div>

      {/* Desktop: right side panel */}
      <div
        className={`hidden md:block fixed top-[3.5rem] right-0 z-[60] h-[calc(100%-3.5rem)] w-[400px] transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full bg-white/95 backdrop-blur-md border-l border-slate-200 shadow-[-8px_0_30px_-12px_rgba(0,0,0,0.12)] flex flex-col">
          {/* Header with close button */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Analysis</p>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
