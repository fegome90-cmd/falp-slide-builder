import type { ReactElement } from 'react';
import type { ContentSlide, CoverSlide, Slide } from '../../src/modules/decks/domain/deck-spec.js';

export function slideHeading(slide: Slide): string {
  return slide.content.headline;
}

/** Explicitly distinguishes editorial review from evidence or a synthetic example. */
export function slideStatusLabel(slide: Slide): string {
  if (slide.reviewStatus === 'draft') {
    if (slide.pattern === 'cover') return 'BORRADOR';
    return `BORRADOR · ${slide.basis === 'synthetic' ? 'EJEMPLO SINTÉTICO' : slide.basis === 'proposal' ? 'PROPUESTA' : 'EVIDENCIA PENDIENTE'}`;
  }
  if (slide.pattern === 'cover') return 'REVISADO';
  if (slide.basis === 'synthetic') return 'EJEMPLO SINTÉTICO';
  if (slide.basis === 'proposal') return 'PROPUESTA';
  return 'EVIDENCIA CON FUENTE';
}

function CoverLayout({ slide }: { slide: CoverSlide }): ReactElement {
  return (
    <div className="slide-body cover-layout">
      <div className="cover-main">
        <p className="eyebrow">{slide.content.eyebrow}</p>
        <h1>{slide.content.headline}</h1>
        <p className="slide-lead">{slide.content.subtitle}</p>
        <p className="slide-author">{slide.content.author}</p>
      </div>
      <aside className="cover-side" aria-label="Contexto de la presentación">
        <p className="side-rule">PRESENTACIÓN HTML</p>
        <p>Composición FALP de referencia</p>
        <p className="side-note">Prototipo personal · contenido sintético</p>
      </aside>
    </div>
  );
}

function StatementEvidenceLayout({ slide }: { slide: Extract<ContentSlide, { pattern: 'statement-evidence' }> }): ReactElement {
  return (
    <div className="slide-body statement-layout">
      <div>
        <h2>{slide.content.headline}</h2>
        <p className="slide-lead">{slide.content.lead}</p>
      </div>
      <figure className="evidence-panel">
        <blockquote>{slide.content.evidence.body}</blockquote>
        <figcaption>Elemento de apoyo</figcaption>
      </figure>
    </div>
  );
}

function ComparisonLayout({ slide }: { slide: Extract<ContentSlide, { pattern: 'comparison' }> }): ReactElement {
  return (
    <div className="slide-body">
      <h2>{slide.content.headline}</h2>
      <div className="comparison-grid">
        {[slide.content.before, slide.content.after].map((part, i) => (
          <section className={i === 0 ? 'comparison-card' : 'comparison-card comparison-card-focus'} key={i} aria-label={part.label}>
            <h3>{part.label}</h3>
            <ul>{part.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function ProcessLayout({ slide }: { slide: Extract<ContentSlide, { pattern: 'process' }> }): ReactElement {
  return (
    <div className="slide-body">
      <h2>{slide.content.headline}</h2>
      <ol className="process-list">
        {slide.content.steps.map((step, i) => (
          <li className="process-step" key={i}>
            <span className="step-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <div><h3>{step.label}</h3><p>{step.detail}</p></div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function DiagramLayout({ slide }: { slide: Extract<ContentSlide, { pattern: 'diagram' }> }): ReactElement {
  const byId = new Map(slide.content.nodes.map(node => [node.id, node.label]));
  return (
    <div className="slide-body">
      <h2>{slide.content.headline}</h2>
      <ul className="diagram-nodes" aria-label="Elementos del diagrama">
        {slide.content.nodes.map(node => <li key={node.id} className="diagram-node">{node.label}</li>)}
      </ul>
      <div className="diagram-relations">
        <h3>Relaciones</h3>
        <ul>{slide.content.edges.map((edge, i) => <li key={i}>{byId.get(edge.from)} → {byId.get(edge.to)}</li>)}</ul>
      </div>
    </div>
  );
}

function ClosingLayout({ slide }: { slide: Extract<ContentSlide, { pattern: 'closing-decision' }> }): ReactElement {
  return (
    <div className="slide-body closing-layout">
      <h2>{slide.content.headline}</h2>
      <p className="closing-ask">{slide.content.ask}</p>
      <ol className="closing-actions">{slide.content.actions.map((action, i) => <li key={i}>{action}</li>)}</ol>
    </div>
  );
}

export function SlideView({ slide, index, total }: { slide: Slide; index: number; total: number }): ReactElement {
  const label = slideStatusLabel(slide);
  const content = (() => {
    switch (slide.pattern) {
      case 'cover': return <CoverLayout slide={slide} />;
      case 'statement-evidence': return <StatementEvidenceLayout slide={slide} />;
      case 'comparison': return <ComparisonLayout slide={slide} />;
      case 'process': return <ProcessLayout slide={slide} />;
      case 'diagram': return <DiagramLayout slide={slide} />;
      case 'closing-decision': return <ClosingLayout slide={slide} />;
    }
  })();
  return (
    <article className={`slide-frame slide-${slide.pattern}`} role="group" aria-roledescription="diapositiva" aria-label={`Diapositiva ${index + 1} de ${total}`} data-slide-id={slide.id}>
      <div className="slide-topline"><span className="prototype-mark">FALP · ESTUDIO DE DISEÑO</span><span className="review-badge">{label}</span></div>
      {content}
      <div className="slide-bottomline"><span>PROTOTIPO PERSONAL · SIN RESPALDO INSTITUCIONAL</span><span>{String(index).padStart(2, '0')} / {String(total - 1).padStart(2, '0')}</span></div>
    </article>
  );
}
