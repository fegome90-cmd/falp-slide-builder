import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ContentSlide, CoverSlide } from '../src/modules/decks/domain/deck-spec.js';
import { SlideView, slideHeading, slideStatusLabel } from '../studio/src/slide-view.js';

const base = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  notes: '',
  sourceRefs: [],
  reviewStatus: 'draft' as const,
};
const cover: CoverSlide = {
  ...base,
  pattern: 'cover',
  content: {
    eyebrow: 'INVESTIGACIÓN',
    headline: 'Una mirada clínica',
    subtitle: 'Ejemplo de práctica',
    author: 'Caso sintético',
  },
};
const make = <P extends ContentSlide['pattern']>(
  pattern: P,
  content: Extract<ContentSlide, { pattern: P }>['content'],
  basis: ContentSlide['basis'] = 'proposal',
): ContentSlide => ({ ...base, pattern, basis, content }) as ContentSlide;
const examples: ContentSlide[] = [
  make('statement-evidence', {
    headline: 'Una idea por lámina',
    lead: 'El hilo conductor',
    evidence: { kind: 'text', body: 'Dato ficticio' },
  }),
  make('comparison', {
    headline: 'Comparación clara',
    before: { label: 'Antes', items: ['A', 'B'] },
    after: { label: 'Después', items: ['C'] },
  }),
  make('process', {
    headline: 'Recorrido',
    steps: [
      { label: 'Observar', detail: 'Escuchar' },
      { label: 'Registrar', detail: 'Anotar' },
    ],
  }),
  make('diagram', {
    headline: 'Relaciones',
    nodes: [
      { id: 'A', label: 'Entrada' },
      { id: 'B', label: 'Salida' },
    ],
    edges: [{ from: 'A', to: 'B' }],
  }),
  make('closing-decision', {
    headline: 'Decidir',
    ask: '¿Seguimos?',
    actions: ['Revisar', 'Continuar'],
  }),
];
const html = (slide: CoverSlide | ContentSlide) =>
  renderToStaticMarkup(createElement(SlideView, { slide, index: 0, total: 6 }));

describe('SlideView components', () => {
  it('renders an accessible FALP slide cover without an unlicensed logo', () => {
    const markup = html(cover);
    expect(markup).toContain('Una mirada clínica');
    expect(markup).toContain('aria-roledescription="diapositiva"');
    expect(markup).toContain('<h1');
    expect(markup).not.toContain('<img');
  });
  it.each(examples.map((x) => [x.pattern, x] as const))(
    'renders %s with a heading and synthetic editorial label',
    (_pattern, slide) => {
      const markup = html(slide);
      expect(markup).toContain(slideHeading(slide));
      expect(markup).toContain('BORRADOR');
      expect(markup).toContain('PROPUESTA');
      expect(markup).toContain('<h2');
    },
  );
  it('keeps comparison columns and mismatched list lengths without dropping content', () => {
    const markup = html(examples[1]);
    expect(markup).toContain('Antes');
    expect(markup).toContain('Después');
    for (const value of ['A', 'B', 'C']) expect(markup).toContain(`>${value}</li>`);
  });
  it('renders ordered process steps and readable diagram relations', () => {
    const process = html(examples[2]);
    expect(process).toContain('<ol');
    expect(process).toContain('Observar');
    expect(process).toContain('Registrar');
    const diagram = html(examples[3]);
    expect(diagram).toContain('Entrada');
    expect(diagram).toContain('Salida');
    expect(diagram).toContain('Entrada → Salida');
  });
  it('renders reviewed synthetic examples as examples, never verified evidence', () => {
    const slide = {
      ...examples[0],
      basis: 'synthetic' as const,
      reviewStatus: 'reviewed' as const,
    };
    expect(slideStatusLabel(slide)).toBe('EJEMPLO SINTÉTICO');
    expect(html(slide)).not.toContain('BORRADOR');
  });
  it('escapes script-like input rather than executing or injecting it', () => {
    const slide = {
      ...examples[0],
      content: {
        ...examples[0].content,
        headline: '¿Qué ocurre? </script><script>alert(1)</script> & <b>',
      },
    };
    const markup = html(slide as ContentSlide);
    expect(markup).toContain('&lt;/script&gt;');
    expect(markup).not.toContain('<script');
    expect(markup).toContain('&amp;');
  });
  it('exposes an accessible group label with the correct slide number', () => {
    const markup = renderToStaticMarkup(
      createElement(SlideView, { slide: examples[0], index: 3, total: 6 }),
    );
    expect(markup).toContain('aria-label="Diapositiva 4 de 6"');
  });
});
