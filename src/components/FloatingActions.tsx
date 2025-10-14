import { Calendar, Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void;
    };
  }
}

const FloatingActions = () => {
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isCalendlyOpen, setIsCalendlyOpen] = useState(false);
  const [calendlyReady, setCalendlyReady] = useState<boolean>(typeof window !== 'undefined' && !!window.Calendly);

  useEffect(() => {
    const handler = () => setIsDownloadOpen(true);
    window.addEventListener('open-download-modal', handler as EventListener);
    return () => window.removeEventListener('open-download-modal', handler as EventListener);
  }, []);

  useEffect(() => {
    if (!isCalendlyOpen) {
      return;
    }

    if (window.Calendly) {
      setCalendlyReady(true);
      return;
    }

    const existingScript = document.querySelector('script[data-calendly-script="true"]') as HTMLScriptElement | null;

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        setCalendlyReady(true);
      } else {
        const onLoad = () => {
          existingScript.dataset.loaded = 'true';
          setCalendlyReady(true);
        };
        existingScript.addEventListener('load', onLoad, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    script.dataset.calendlyScript = 'true';
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      setCalendlyReady(true);
    });
    document.body.appendChild(script);
  }, [isCalendlyOpen]);

  useEffect(() => {
    if (!isCalendlyOpen || !calendlyReady) {
      return;
    }

    const container = document.getElementById('calendly-inline-widget');
    if (!container || !window.Calendly) {
      return;
    }

    container.innerHTML = '';
    window.Calendly.initInlineWidget({
      url: 'https://calendly.com/chad-avalon1/30min',
      parentElement: container,
    });
  }, [isCalendlyOpen, calendlyReady]);

  useEffect(() => {
    if (!isDownloadOpen && !isCalendlyOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDownloadOpen(false);
        setIsCalendlyOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDownloadOpen, isCalendlyOpen]);

  const closeModals = () => {
    setIsDownloadOpen(false);
    setIsCalendlyOpen(false);
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-between gap-4 px-6 sm:px-10 lg:px-24">
        <button
          type="button"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-indigo-700 px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600"
          onClick={() => setIsDownloadOpen(true)}
        >
          <Download size={16} /> Download CV
        </button>
        <button
          type="button"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-500"
          onClick={() => setIsCalendlyOpen(true)}
        >
          <Calendar size={16} /> Schedule time with me
        </button>
      </div>

      {isDownloadOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={closeModals}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border border-white/10 bg-night-soft/95 p-8 text-left shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-6 top-6 text-slate-400 transition hover:text-white"
              onClick={closeModals}
              aria-label="Close download options"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold uppercase tracking-[0.3em] text-white">Choose your download</h2>
            <p className="mt-2 text-sm text-slate-300">Select the document that fits what you need.</p>
            <div className="mt-6 flex flex-col gap-4">
              <a
                href="/files/ChadAvalonCV.pdf"
                download
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-night/40 px-5 py-4 text-sm uppercase tracking-[0.25em] text-white transition hover:border-accent hover:text-accent"
              >
                Curriculum Vitae
                <span className="text-xs text-slate-400">PDF · 61 KB</span>
              </a>
              <a
                href="/files/Chad_Avalon_Resume_Final.pdf"
                download
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-night/40 px-5 py-4 text-sm uppercase tracking-[0.25em] text-white transition hover:border-accent hover:text-accent"
              >
                Resume
                <span className="text-xs text-slate-400">PDF</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {isCalendlyOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={closeModals}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-night-soft/95 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-6 top-6 text-slate-400 transition hover:text-white"
              onClick={closeModals}
              aria-label="Close scheduling modal"
            >
              <X size={20} />
            </button>
            <div className="p-6 text-left">
              <h2 className="text-lg font-semibold uppercase tracking-[0.3em] text-white">Schedule time with me</h2>
              <p className="mt-2 text-sm text-slate-300">Pick a time that works best, and Calendly will handle the rest.</p>
            </div>
            <div className="h-[640px] w-full bg-night">
              {calendlyReady ? (
                <div id="calendly-inline-widget" className="h-full w-full" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading scheduler…</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default FloatingActions;
