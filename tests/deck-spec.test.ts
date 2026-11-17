import { describe, expect, it } from 'vitest';
import {
  DeckValidationError,
  parseDeckSpec,
  validateBrandRevision,
  validateDeckReadyForExport,
} from '../src/modules/decks/domain/deck-spec.js';

const pin = 'c41db3fb1b815aa2d5e4fecf42a200023f2bba20';
const ref = { id: 'ref-1', label: 'Documento sintético', url: 'https://example.org/evidence' };
const base = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  notes: '',
  sourceRefs: [],
  reviewStatus: 'draft',
};
const cover = {
  ...base,
  pattern: 'cover',
  content: {
    eyebrow: 'Investigación',
    headline: 'Un caso de prueba',
    subtitle: 'Material sintético',
    author: 'Equipo de prueba',
  },
};
const statement = {
  ...base,
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  basis: 'proposal',
  pattern: 'statement-evidence',
  content: {
    headline: 'Una propuesta',
    lead: 'Una idea',
    evidence: { kind: 'text', body: 'Dato de prueba' },
  },
};
function deck(slides: unknown[] = [cover, statement]) {
  return {
    schema: 'falp.deck.v1',
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    revision: 0,
    brandRevision: pin,
    title: 'Un caso de prueba',
    sources: [ref],
    slides,
  };
}
const cases = {
  comparison: {
    headline: 'Comparación',
    before: { label: 'Antes', items: ['A'] },
    after: { label: 'Después', items: ['B'] },
  },
  process: {
    headline: 'Proceso',
    steps: [
      { label: 'Paso 1', detail: 'Primero' },
      { label: 'Paso 2', detail: 'Segundo' },
    ],
  },
  diagram: {
    headline: 'Diagrama',
    nodes: [
      { id: 'n1', label: 'Entrada' },
      { id: 'n2', label: 'Salida' },
    ],
    edges: [{ from: 'n1', to: 'n2' }],
  },
  'closing-decision': {
    headline: 'Decisión',
    ask: 'Definir el paso siguiente',
    actions: ['Continuar'],
  },
};
function content(pattern: keyof typeof cases, overrides: Record<string, unknown> = {}) {
  return {
    ...base,
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    basis: 'proposal',
    pattern,
    content: cases[pattern],
    ...overrides,
  };
}
function errors(value: unknown) {
  try {
    parseDeckSpec(value);
    return [];
  } catch (error) {
    expect(error).toBeInstanceOf(DeckValidationError);
    return (error as DeckValidationError).issues.map((issue) => issue.code);
  }
}

describe('DeckSpec v1: structure, language and editorial safety', () => {
  it('accepts one cover and each of the five content layouts', () => {
    for (const [pattern] of Object.entries(cases) as Array<[keyof typeof cases, unknown]>) {
      const result = parseDeckSpec(deck([cover, content(pattern)]));
      expect(result.slides).toHaveLength(2);
      expect(result.slides[0].pattern).toBe('cover');
      expect(result.slides[1].pattern).toBe(pattern);
      expect(JSON.stringify(result)).toContain('Un caso de prueba');
    }
  });
  it('preserves Spanish diacritics, emoji and script-like strings as plain text', () => {
    const value = deck([
      { ...cover, content: { ...cover.content, headline: '¿Qué ocurrió? 🩺 & </script>' } },
      statement,
    ]);
    value.title = '¿Qué ocurrió? 🩺 & </script>';
    expect(parseDeckSpec(value).title).toBe(value.title);
  });
  it('rejects empty slides, missing cover and a second cover', () => {
    expect(errors(deck([]))).toContain('MISSING_COVER');
    expect(errors(deck([statement]))).toContain('MISSING_COVER');
    expect(
      errors(deck([cover, { ...cover, id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }])),
    ).toContain('MULTIPLE_COVERS');
  });
  it('rejects mismatched deck title and cover headline', () => {
    expect(errors({ ...deck(), title: 'Título diferente' })).toContain('COVER_TITLE_MISMATCH');
  });
  it('rejects unrecognized patterns and unexpected keys', () => {
    expect(errors(deck([cover, { ...statement, pattern: 'invented' }]))).toContain(
      'INVALID_PATTERN',
    );
    expect(errors({ ...deck(), debug: true })).toContain('UNKNOWN_PROPERTY');
    expect(
      errors(deck([cover, { ...statement, dangerouslySetInnerHTML: '<script />' }])),
    ).toContain('UNKNOWN_PROPERTY');
  });
  it('rejects duplicate IDs for slides and source references', () => {
    expect(errors(deck([cover, { ...statement, id: cover.id }]))).toContain('DUPLICATE_ID');
    expect(errors({ ...deck(), sources: [ref, ref] })).toContain('DUPLICATE_ID');
  });
  it('rejects invalid UUID, revision, brand pin and unsafe URL', () => {
    expect(errors({ ...deck(), id: '../escape' })).toContain('INVALID_UUID');
    expect(errors({ ...deck(), revision: -1 })).toContain('INVALID_REVISION');
    expect(errors({ ...deck(), brandRevision: 'abc' })).toContain('INVALID_PIN');
    expect(errors({ ...deck(), sources: [{ ...ref, url: 'javascript:alert(1)' }] })).toContain(
      'INVALID_URL',
    );
    expect(errors({ ...deck(), sources: [{ ...ref, url: 'http://example.org' }] })).toContain(
      'INVALID_URL',
    );
  });
  it('enforces Unicode code point and size limits', () => {
    const headline = '🩺'.repeat(180);
    expect(
      parseDeckSpec({
        ...deck(),
        title: headline,
        slides: [{ ...cover, content: { ...cover.content, headline } }, statement],
      }).title,
    ).toBe(headline);
    expect(
      errors({
        ...deck(),
        title: `${headline}🩺`,
        slides: [{ ...cover, content: { ...cover.content, headline: `${headline}🩺` } }, statement],
      }),
    ).toContain('TEXT_TOO_LONG');
    expect(
      errors(
        deck([
          cover,
          ...Array.from({ length: 60 }, (_, i) => ({
            ...statement,
            id: `00000000-0000-4000-8000-${(i + 1).toString().padStart(12, '0')}`,
          })),
        ]),
      ),
    ).toContain('TOO_MANY_SLIDES');
    expect(errors(deck([{ ...cover, notes: 'n'.repeat(8_001) }, statement]))).toContain(
      'TEXT_TOO_LONG',
    );
  });
  it('validates comparison, process, diagram and closing decision rules', () => {
    expect(
      errors(
        deck([
          cover,
          content('comparison', {
            content: { ...cases.comparison, before: { label: 'Antes', items: Array(9).fill('X') } },
          }),
        ]),
      ),
    ).toContain('TOO_MANY_ITEMS');
    expect(
      errors(
        deck([
          cover,
          content('process', {
            content: { ...cases.process, steps: [{ label: 'Solo', detail: 'Uno' }] },
          }),
        ]),
      ),
    ).toContain('INVALID_STEP_COUNT');
    expect(
      errors(
        deck([
          cover,
          content('diagram', {
            content: { ...cases.diagram, edges: [{ from: 'n1', to: 'ghost' }] },
          }),
        ]),
      ),
    ).toContain('BROKEN_EDGE');
    expect(
      errors(
        deck([
          cover,
          content('diagram', {
            content: {
              ...cases.diagram,
              nodes: [
                { id: 'n1', label: 'A' },
                { id: 'n1', label: 'B' },
              ],
            },
          }),
        ]),
      ),
    ).toContain('DUPLICATE_ID');
    expect(
      errors(
        deck([
          cover,
          content('closing-decision', {
            content: { ...cases['closing-decision'], actions: ['A', 'B', 'C', 'D'] },
          }),
        ]),
      ),
    ).toContain('TOO_MANY_ITEMS');
  });
  it('allows an incomplete draft but requires completeness for reviewed slides', () => {
    const incomplete = { ...statement, content: { ...statement.content, headline: '' } };
    expect(parseDeckSpec(deck([cover, incomplete])).slides[1].reviewStatus).toBe('draft');
    expect(errors(deck([cover, { ...incomplete, reviewStatus: 'reviewed' }]))).toContain(
      'INCOMPLETE_CONTENT',
    );
  });
  it('requires an existing source for reviewed factual claims regardless of layout', () => {
    for (const pattern of ['statement-evidence', ...Object.keys(cases)] as Array<
      keyof typeof cases | 'statement-evidence'
    >) {
      const item =
        pattern === 'statement-evidence'
          ? { ...statement }
          : content(pattern as keyof typeof cases);
      expect(
        errors(
          deck([cover, { ...item, basis: 'evidence', reviewStatus: 'reviewed', sourceRefs: [] }]),
        ),
      ).toContain('MISSING_SOURCE');
      expect(
        errors(
          deck([
            cover,
            { ...item, basis: 'evidence', reviewStatus: 'reviewed', sourceRefs: ['unknown'] },
          ]),
        ),
      ).toContain('UNKNOWN_SOURCE');
      expect(
        parseDeckSpec(
          deck([
            cover,
            { ...item, basis: 'evidence', reviewStatus: 'reviewed', sourceRefs: ['ref-1'] },
          ]),
        ).slides,
      ).toHaveLength(2);
    }
  });
  it('distinguishes reviewed proposals and synthetic examples from evidence', () => {
    for (const basis of ['proposal', 'synthetic'] as const) {
      const item = { ...statement, reviewStatus: 'reviewed', basis };
      expect(parseDeckSpec(deck([cover, item])).slides[1]).toMatchObject({ basis });
      expect(
        validateDeckReadyForExport(
          parseDeckSpec(deck([{ ...cover, reviewStatus: 'reviewed' }, item])),
          pin,
        ),
      ).toEqual([]);
    }
  });
  it('retains historical pins as readable documents but blocks export', () => {
    const oldPin = '1111111111111111111111111111111111111111';
    const old = parseDeckSpec({ ...deck(), brandRevision: oldPin });
    expect(validateBrandRevision(old, pin)).toBe('BRAND_PIN_MISMATCH');
    expect(validateDeckReadyForExport(old, pin)).toContainEqual({
      slideId: null,
      code: 'BRAND_PIN_MISMATCH',
    });
    expect(validateBrandRevision(parseDeckSpec(deck()), pin)).toBe('MATCH');
  });
  it('treats a cover-only deck as draft export and reports other draft slides', () => {
    const onlyCover = parseDeckSpec(deck([cover]));
    expect(validateDeckReadyForExport(onlyCover, pin)).toContainEqual({
      slideId: null,
      code: 'DRAFT_SLIDE',
    });
    expect(validateDeckReadyForExport(parseDeckSpec(deck()), pin)).toContainEqual({
      slideId: statement.id,
      code: 'DRAFT_SLIDE',
    });
  });
});
