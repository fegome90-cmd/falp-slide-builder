import { useCallback, useEffect, useState } from 'react';
import { sampleDeck } from './sample-deck.js';
import { SlideView } from './slide-view.js';

export function clampSlide(index: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Number.isFinite(index) ? Math.trunc(index) : 0));
}

export function slideFromHash(hash: string, count: number): number {
  const match = /^#(0|[1-9][0-9]*)$/.exec(hash);
  if (!match) return 0;
  return clampSlide(Number(match[1]), count);
}

export function isEditableKeyTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="dialog"]'));
}

/** Read-only visual harness: authoring and autosave belong to a separate implementation gate. */
export function SlideStudioPreview() {
  const slides = sampleDeck.slides;
  const [index, setIndex] = useState(() => slideFromHash(window.location.hash, slides.length));
  const go = useCallback((target: number) => {
    const next = clampSlide(target, slides.length);
    window.history.pushState(null, '', `#${next}`);
    setIndex(next);
  }, [slides.length]);

  useEffect(() => {
    const fromHistory = () => setIndex(slideFromHash(window.location.hash, slides.length));
    window.addEventListener('popstate', fromHistory);
    window.addEventListener('hashchange', fromHistory);
    return () => {
      window.removeEventListener('popstate', fromHistory);
      window.removeEventListener('hashchange', fromHistory);
    };
  }, [slides.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.metaKey || event.ctrlKey || isEditableKeyTarget(event.target)) return;
      const nativeActivation = event.target instanceof Element && Boolean(event.target.closest('button,a[href],[role="button"]'));
      let target: number | null = null;
      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
          target = index + 1;
          break;
        case 'ArrowLeft':
        case 'PageUp':
          target = index - 1;
          break;
        case 'Home':
          target = 0;
          break;
        case 'End':
          target = slides.length - 1;
          break;
        case ' ':
          if (!nativeActivation) target = event.shiftKey ? index - 1 : index + 1;
          break;
      }
      if (target === null) return;
      event.preventDefault();
      go(target);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, slides.length]);

  return (
    <main className="preview-shell">
      <header className="preview-header">
        <span className="preview-brand">FALP <span className="preview-brand-aside">/ LABORATORIO HTML</span></span>
        <span className="preview-private">Prototipo personal · sin contenido clínico real</span>
      </header>
      <div data-testid="active-slide" data-pattern={slides[index].pattern} className="slide-holder">
        <SlideView slide={slides[index]} index={index} total={slides.length} />
      </div>
      <nav className="preview-navigation" aria-label="Navegación de diapositivas">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0}>Anterior</button>
        <div className="preview-dots" role="group" aria-label="Ir a diapositiva">
          {slides.map((slide, i) => (
            <button type="button" key={slide.id} aria-label={`Ir a diapositiva ${i + 1}`} aria-current={i === index ? 'step' : undefined} className={i === index ? 'dot dot-active' : 'dot'} onClick={() => go(i)}>{i + 1}</button>
          ))}
        </div>
        <button type="button" onClick={() => go(index + 1)} disabled={index === slides.length - 1}>Siguiente</button>
      </nav>
      <p className="preview-help">Flechas · Inicio · Fin · Espacio. Contenido sintético para pruebas de diseño.</p>
    </main>
  );
}
