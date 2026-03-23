// ============================================
// Tipos — DeckForge
// ============================================

export type PresentationCategory = 'workshop' | 'treinamento' | 'venda' | 'proposta' | 'pitch' | 'sprint-review' | 'sprint-planning' | 'retro' | 'daily' | 'demo' | 'kickoff' | 'outro';

export const PRESENTATION_CATEGORY_LABELS: Record<PresentationCategory, string> = {
  workshop: 'Workshops',
  treinamento: 'Treinamentos',
  venda: 'Vendas',
  proposta: 'Propostas',
  pitch: 'Pitches',
  'sprint-review': 'Sprint Reviews',
  'sprint-planning': 'Sprint Plannings',
  retro: 'Retrospectivas',
  daily: 'Dailies / Sync',
  demo: 'Demos',
  kickoff: 'Kickoffs',
  outro: 'Outros',
};
