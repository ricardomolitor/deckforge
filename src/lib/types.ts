// ============================================
// Tipos — DeckForge
// ============================================

export type PresentationCategory = 'workshop' | 'treinamento' | 'venda' | 'proposta' | 'pitch' | 'outro';

export const PRESENTATION_CATEGORY_LABELS: Record<PresentationCategory, string> = {
  workshop: 'Workshops',
  treinamento: 'Treinamentos',
  venda: 'Vendas',
  proposta: 'Propostas',
  pitch: 'Pitches',
  outro: 'Outros',
};
