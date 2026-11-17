import type { DeckSpec } from '../../src/modules/decks/domain/deck-spec.js';

const base = { notes: '', sourceRefs: [], reviewStatus: 'draft' as const };
export const sampleDeck: DeckSpec = {
  schema: 'falp.deck.v1',
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  revision: 0,
  brandRevision: 'c41db3fb1b815aa2d5e4fecf42a200023f2bba20',
  title: 'Diseñar información que se pueda comprender',
  sources: [],
  slides: [
    { ...base, pattern: 'cover', id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      content: { eyebrow: 'ENFERMERÍA / SALUD DIGITAL', headline: 'Diseñar información que se pueda comprender', subtitle: 'Seis composiciones para evaluar un único sistema editorial.', author: 'Ejercicio sintético' } },
    { ...base, pattern: 'statement-evidence', id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', basis: 'synthetic',
      content: { headline: 'Una pregunta clara orienta el diseño', lead: 'Primero definimos qué debe entender quien mira.', evidence: { kind: 'text', body: 'Esta frase es demostrativa. No representa evidencia clínica ni resultados medidos.' } } },
    { ...base, pattern: 'comparison', id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', basis: 'synthetic',
      content: { headline: 'Comparar exige categorías equivalentes', before: { label: 'Antes', items: ['Información dispersa', 'Lectura repetida', 'Falta de contexto'] }, after: { label: 'Propuesta', items: ['Estructura consistente', 'Lectura orientada', 'Fuentes visibles'] } } },
    { ...base, pattern: 'process', id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', basis: 'synthetic',
      content: { headline: 'El orden del proceso cambia la comprensión', steps: [{ label: 'Observar', detail: 'Reunir señales relevantes.' }, { label: 'Interpretar', detail: 'Considerar el contexto.' }, { label: 'Registrar', detail: 'Explicitar lo observado.' }, { label: 'Compartir', detail: 'Conservar lo necesario.' }] } },
    { ...base, pattern: 'diagram', id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', basis: 'synthetic',
      content: { headline: 'Un diagrama muestra relaciones', nodes: [{ id: 'a', label: 'Persona' }, { id: 'b', label: 'Proceso' }, { id: 'c', label: 'Registro' }], edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }] } },
    { ...base, pattern: 'closing-decision', id: '11111111-1111-4111-8111-111111111111', basis: 'proposal',
      content: { headline: 'La siguiente mejora requiere una decisión', ask: '¿Qué conviene validar antes de ampliar el sistema?', actions: ['Definir el alcance', 'Probar los casos', 'Revisar con personas'] } },
  ],
};
