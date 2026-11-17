/** Format-neutral, deliberately inert HTML presentation document. No executable markup. */
export const DECK_SCHEMA = 'falp.deck.v1' as const;
export const ACTIVE_BRAND_REVISION = 'c41db3fb1b815aa2d5e4fecf42a200023f2bba20';
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA_RE = /^[0-9a-f]{40}$/i;
const REVIEW_STATUSES = ['draft', 'reviewed'] as const;
const BASES = ['evidence', 'proposal', 'synthetic'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type Basis = (typeof BASES)[number];
export type Ref = { id: string; label: string; url: string };
type SlideBase = { id: string; notes: string; sourceRefs: string[]; reviewStatus: ReviewStatus };
export type CoverSlide = SlideBase & {
  pattern: 'cover';
  content: { eyebrow: string; headline: string; subtitle: string; author: string };
};
type ContentBase = SlideBase & { basis: Basis };
export type ContentSlide = ContentBase &
  (
    | {
        pattern: 'statement-evidence';
        content: { headline: string; lead: string; evidence: { kind: 'text'; body: string } };
      }
    | {
        pattern: 'comparison';
        content: {
          headline: string;
          before: { label: string; items: string[] };
          after: { label: string; items: string[] };
        };
      }
    | {
        pattern: 'process';
        content: { headline: string; steps: Array<{ label: string; detail: string }> };
      }
    | {
        pattern: 'diagram';
        content: {
          headline: string;
          nodes: Array<{ id: string; label: string }>;
          edges: Array<{ from: string; to: string }>;
        };
      }
    | { pattern: 'closing-decision'; content: { headline: string; ask: string; actions: string[] } }
  );
export type Slide = CoverSlide | ContentSlide;
export type DeckSpec = {
  schema: typeof DECK_SCHEMA;
  id: string;
  revision: number;
  brandRevision: string;
  title: string;
  sources: Ref[];
  slides: [CoverSlide, ...ContentSlide[]];
};
export type DeckIssueCode =
  | 'INVALID_DOCUMENT'
  | 'UNKNOWN_PROPERTY'
  | 'INVALID_SCHEMA'
  | 'INVALID_UUID'
  | 'INVALID_REVISION'
  | 'INVALID_PIN'
  | 'INVALID_TEXT'
  | 'TEXT_TOO_LONG'
  | 'INVALID_ARRAY'
  | 'INVALID_PATTERN'
  | 'MISSING_COVER'
  | 'MULTIPLE_COVERS'
  | 'COVER_TITLE_MISMATCH'
  | 'DUPLICATE_ID'
  | 'INVALID_URL'
  | 'TOO_MANY_SLIDES'
  | 'TOO_MANY_SOURCES'
  | 'TOO_MANY_ITEMS'
  | 'INVALID_STEP_COUNT'
  | 'BROKEN_EDGE'
  | 'UNKNOWN_SOURCE'
  | 'MISSING_SOURCE'
  | 'INCOMPLETE_CONTENT'
  | 'DOCUMENT_TOO_LARGE';
export type DeckIssue = { path: string; code: DeckIssueCode };
export type ExportIssue = {
  slideId: string | null;
  code: 'DRAFT_SLIDE' | 'MISSING_SOURCE' | 'INCOMPLETE_CONTENT' | 'BRAND_PIN_MISMATCH';
};

export class DeckValidationError extends Error {
  constructor(public readonly issues: DeckIssue[]) {
    super(`DeckSpec inválido: ${issues.map((issue) => `${issue.path}: ${issue.code}`).join(', ')}`);
    this.name = 'DeckValidationError';
  }
}

type RecordValue = Record<string, unknown>;
const object = (value: unknown): value is RecordValue =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const unicodeLength = (value: string): number => Array.from(value).length;
const text = (value: unknown): value is string => typeof value === 'string';
const asRecord = (value: unknown): RecordValue => (object(value) ? value : {});

export function parseDeckSpec(input: unknown): DeckSpec {
  const issues: DeckIssue[] = [];
  const add = (path: string, code: DeckIssueCode): void => {
    issues.push({ path, code });
  };
  const checkObject = (value: unknown, path: string, allowed: readonly string[]): RecordValue => {
    if (!object(value)) {
      add(path, 'INVALID_DOCUMENT');
      return {};
    }
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) add(`${path}.${key}`, 'UNKNOWN_PROPERTY');
    }
    return value;
  };
  const checkString = (value: unknown, path: string, max: number, required = true): string => {
    if (!text(value)) {
      add(path, 'INVALID_TEXT');
      return '';
    }
    if (unicodeLength(value) > max) add(path, 'TEXT_TOO_LONG');
    if (required && value.trim() === '') add(path, 'INCOMPLETE_CONTENT');
    return value;
  };
  const checkStringArray = (
    value: unknown,
    path: string,
    maxCount: number,
    maxLen: number,
  ): string[] => {
    if (!Array.isArray(value)) {
      add(path, 'INVALID_ARRAY');
      return [];
    }
    if (value.length > maxCount) add(path, 'TOO_MANY_ITEMS');
    return value.map((item, i) => checkString(item, `${path}[${i}]`, maxLen, false));
  };
  const checkSlideBase = (slide: RecordValue, path: string, withBasis: boolean): void => {
    if (!text(slide.id) || !UUID_RE.test(slide.id)) add(`${path}.id`, 'INVALID_UUID');
    checkString(slide.notes, `${path}.notes`, 8000, false);
    checkStringArray(slide.sourceRefs, `${path}.sourceRefs`, 120, 120);
    if (!REVIEW_STATUSES.includes(slide.reviewStatus as ReviewStatus))
      add(`${path}.reviewStatus`, 'INVALID_DOCUMENT');
    if (withBasis && !BASES.includes(slide.basis as Basis))
      add(`${path}.basis`, 'INVALID_DOCUMENT');
  };
  if (!object(input)) throw new DeckValidationError([{ path: '$', code: 'INVALID_DOCUMENT' }]);
  let bytes = 0;
  try {
    bytes = Buffer.byteLength(JSON.stringify(input), 'utf8');
  } catch {
    add('$', 'INVALID_DOCUMENT');
  }
  if (bytes > MAX_DOCUMENT_BYTES) add('$', 'DOCUMENT_TOO_LARGE');
  const root = checkObject(input, '$', [
    'schema',
    'id',
    'revision',
    'brandRevision',
    'title',
    'sources',
    'slides',
  ]);
  if (root.schema !== DECK_SCHEMA) add('$.schema', 'INVALID_SCHEMA');
  if (!text(root.id) || !UUID_RE.test(root.id)) add('$.id', 'INVALID_UUID');
  if (!Number.isSafeInteger(root.revision) || (root.revision as number) < 0)
    add('$.revision', 'INVALID_REVISION');
  if (!text(root.brandRevision) || !SHA_RE.test(root.brandRevision))
    add('$.brandRevision', 'INVALID_PIN');
  checkString(root.title, '$.title', 180);
  const sourceIds = new Set<string>();
  if (!Array.isArray(root.sources)) add('$.sources', 'INVALID_ARRAY');
  else {
    if (root.sources.length > 120) add('$.sources', 'TOO_MANY_SOURCES');
    root.sources.forEach((value, i) => {
      const path = `$.sources[${i}]`;
      const ref = checkObject(value, path, ['id', 'label', 'url']);
      const id = checkString(ref.id, `${path}.id`, 120);
      checkString(ref.label, `${path}.label`, 220);
      if (sourceIds.has(id)) add(`${path}.id`, 'DUPLICATE_ID');
      sourceIds.add(id);
      const url = checkString(ref.url, `${path}.url`, 2048);
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname)
          add(`${path}.url`, 'INVALID_URL');
      } catch {
        add(`${path}.url`, 'INVALID_URL');
      }
    });
  }
  if (!Array.isArray(root.slides)) add('$.slides', 'INVALID_ARRAY');
  const slides = Array.isArray(root.slides) ? root.slides : [];
  if (slides.length === 0 || asRecord(slides[0]).pattern !== 'cover')
    add('$.slides[0]', 'MISSING_COVER');
  if (slides.length > 60) add('$.slides', 'TOO_MANY_SLIDES');
  const slideIds = new Set<string>();
  slides.forEach((value, i) => {
    const path = `$.slides[${i}]`;
    const slide = checkObject(
      value,
      path,
      ['id', 'notes', 'sourceRefs', 'reviewStatus', 'basis', 'pattern', 'content'].filter(
        (key) => key !== 'basis' || i !== 0,
      ),
    );
    const isCover = slide.pattern === 'cover';
    if (i > 0 && isCover) add(path, 'MULTIPLE_COVERS');
    if (
      !isCover &&
      !['statement-evidence', 'comparison', 'process', 'diagram', 'closing-decision'].includes(
        String(slide.pattern),
      )
    )
      add(`${path}.pattern`, 'INVALID_PATTERN');
    checkSlideBase(slide, path, !isCover);
    if (slideIds.has(String(slide.id))) add(`${path}.id`, 'DUPLICATE_ID');
    slideIds.add(String(slide.id));
    if (Array.isArray(slide.sourceRefs))
      for (const id of slide.sourceRefs) {
        if (typeof id === 'string' && !sourceIds.has(id))
          add(`${path}.sourceRefs`, 'UNKNOWN_SOURCE');
      }
    const content = checkObject(
      slide.content,
      `${path}.content`,
      isCover
        ? ['eyebrow', 'headline', 'subtitle', 'author']
        : slide.pattern === 'statement-evidence'
          ? ['headline', 'lead', 'evidence']
          : slide.pattern === 'comparison'
            ? ['headline', 'before', 'after']
            : slide.pattern === 'process'
              ? ['headline', 'steps']
              : slide.pattern === 'diagram'
                ? ['headline', 'nodes', 'edges']
                : slide.pattern === 'closing-decision'
                  ? ['headline', 'ask', 'actions']
                  : [],
    );
    const required = slide.reviewStatus === 'reviewed';
    checkString(content.headline, `${path}.content.headline`, 180, required);
    if (isCover) {
      checkString(content.eyebrow, `${path}.content.eyebrow`, 180, false);
      checkString(content.subtitle, `${path}.content.subtitle`, 900, false);
      checkString(content.author, `${path}.content.author`, 180, false);
      return;
    }
    if (
      slide.reviewStatus === 'reviewed' &&
      slide.basis === 'evidence' &&
      (!Array.isArray(slide.sourceRefs) || slide.sourceRefs.length === 0)
    ) {
      add(`${path}.sourceRefs`, 'MISSING_SOURCE');
    }
    switch (slide.pattern) {
      case 'statement-evidence': {
        checkString(content.lead, `${path}.content.lead`, 900, required);
        const evidence = checkObject(content.evidence, `${path}.content.evidence`, [
          'kind',
          'body',
        ]);
        if (evidence.kind !== 'text') add(`${path}.content.evidence.kind`, 'INVALID_DOCUMENT');
        checkString(evidence.body, `${path}.content.evidence.body`, 3000, required);
        break;
      }
      case 'comparison': {
        for (const side of ['before', 'after']) {
          const card = checkObject(content[side], `${path}.content.${side}`, ['label', 'items']);
          checkString(card.label, `${path}.content.${side}.label`, 180, required);
          const items = checkStringArray(card.items, `${path}.content.${side}.items`, 8, 220);
          if (required && items.length === 0)
            add(`${path}.content.${side}.items`, 'INCOMPLETE_CONTENT');
        }
        break;
      }
      case 'process': {
        if (!Array.isArray(content.steps)) add(`${path}.content.steps`, 'INVALID_ARRAY');
        const steps = Array.isArray(content.steps) ? content.steps : [];
        if (steps.length < 2 || steps.length > 5)
          add(`${path}.content.steps`, 'INVALID_STEP_COUNT');
        steps.forEach((v, j) => {
          const step = checkObject(v, `${path}.content.steps[${j}]`, ['label', 'detail']);
          checkString(step.label, `${path}.content.steps[${j}].label`, 180, required);
          checkString(step.detail, `${path}.content.steps[${j}].detail`, 500, required);
        });
        break;
      }
      case 'diagram': {
        if (!Array.isArray(content.nodes)) add(`${path}.content.nodes`, 'INVALID_ARRAY');
        if (!Array.isArray(content.edges)) add(`${path}.content.edges`, 'INVALID_ARRAY');
        const nodes = Array.isArray(content.nodes) ? content.nodes : [];
        const edges = Array.isArray(content.edges) ? content.edges : [];
        if (nodes.length > 8) add(`${path}.content.nodes`, 'TOO_MANY_ITEMS');
        if (edges.length > 12) add(`${path}.content.edges`, 'TOO_MANY_ITEMS');
        if (required && nodes.length === 0) add(`${path}.content.nodes`, 'INCOMPLETE_CONTENT');
        const ids = new Set<string>();
        nodes.forEach((v, j) => {
          const node = checkObject(v, `${path}.content.nodes[${j}]`, ['id', 'label']);
          const id = checkString(node.id, `${path}.content.nodes[${j}].id`, 120);
          checkString(node.label, `${path}.content.nodes[${j}].label`, 220, required);
          if (ids.has(id)) add(`${path}.content.nodes[${j}].id`, 'DUPLICATE_ID');
          ids.add(id);
        });
        edges.forEach((v, j) => {
          const edge = checkObject(v, `${path}.content.edges[${j}]`, ['from', 'to']);
          for (const end of ['from', 'to']) {
            const id = checkString(edge[end], `${path}.content.edges[${j}].${end}`, 120);
            if (!ids.has(id)) add(`${path}.content.edges[${j}].${end}`, 'BROKEN_EDGE');
          }
        });
        break;
      }
      case 'closing-decision': {
        checkString(content.ask, `${path}.content.ask`, 600, required);
        const actions = checkStringArray(content.actions, `${path}.content.actions`, 3, 220);
        if (required && actions.length === 0) add(`${path}.content.actions`, 'INCOMPLETE_CONTENT');
        break;
      }
      default:
        break;
    }
  });
  if (
    slides.length > 0 &&
    text(root.title) &&
    text(asRecord(asRecord(slides[0]).content).headline) &&
    root.title !== asRecord(asRecord(slides[0]).content).headline
  )
    add('$.title', 'COVER_TITLE_MISMATCH');
  if (issues.length > 0) throw new DeckValidationError(issues);
  return input as DeckSpec;
}

export function validateBrandRevision(
  deck: DeckSpec,
  activePin: string,
): 'MATCH' | 'BRAND_PIN_MISMATCH' {
  return deck.brandRevision.toLowerCase() === activePin.toLowerCase()
    ? 'MATCH'
    : 'BRAND_PIN_MISMATCH';
}

/** Non-mutating report: never confuses editorial review with clinical truth. */
export function validateDeckReadyForExport(deck: DeckSpec, activePin: string): ExportIssue[] {
  const issues: ExportIssue[] = [];
  if (validateBrandRevision(deck, activePin) !== 'MATCH')
    issues.push({ slideId: null, code: 'BRAND_PIN_MISMATCH' });
  if (deck.slides.length < 2) issues.push({ slideId: null, code: 'DRAFT_SLIDE' });
  const sources = new Set(deck.sources.map((source) => source.id));
  for (const slide of deck.slides) {
    if (slide.reviewStatus === 'draft') {
      issues.push({ slideId: slide.id, code: 'DRAFT_SLIDE' });
      continue;
    }
    if (slide.pattern !== 'cover') {
      if (slide.basis === 'evidence' && !slide.sourceRefs.some((ref) => sources.has(ref))) {
        issues.push({ slideId: slide.id, code: 'MISSING_SOURCE' });
      }
      if (!slide.content.headline.trim())
        issues.push({ slideId: slide.id, code: 'INCOMPLETE_CONTENT' });
    }
  }
  return issues;
}
