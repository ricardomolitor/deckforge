// ============================================
// Tipos — DeckForge
// ============================================

export type PresentationCategory = 'relatorio-executivo' | 'business-case' | 'apresentacao-livre';

export const PRESENTATION_CATEGORY_LABELS: Record<PresentationCategory, string> = {
  'relatorio-executivo': 'Relatórios Executivos',
  'business-case': 'Business Cases',
  'apresentacao-livre': 'Apresentações Livres',
};
