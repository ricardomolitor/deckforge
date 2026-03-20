// ============================================
// Tipos e Interfaces — DeckForge
// ============================================

// --- Enums ---

export type WorkshopStatus = 'rascunho' | 'em_preparacao' | 'agenda_aprovada' | 'concluido';

export type WorkshopType =
  // Workshops
  | 'discovery'
  | 'ideacao'
  | 'priorizacao'
  | 'alinhamento_estrategico'
  | 'design_sprint'
  | 'retrospectiva'
  | 'kickoff'
  // Treinamentos
  | 'treinamento_tecnico'
  | 'treinamento_produto'
  | 'onboarding'
  // Vendas
  | 'venda_consultiva'
  | 'demo_produto'
  // Propostas
  | 'proposta_tecnica'
  | 'proposta_comercial'
  // Pitches
  | 'pitch_executivo'
  | 'pitch_investidor'
  | 'outro';

export type PresentationCategory = 'workshop' | 'treinamento' | 'venda' | 'proposta' | 'pitch' | 'outro';

export type WorkshopLocation = 'online' | 'presencial' | 'hibrido';

export type TurmaStatus = 'rascunho' | 'em_preparacao' | 'pronta' | 'concluida';

export type MaterialType = 'arquivo' | 'link' | 'outro';

export type MaterialPhase = 'pre_workshop' | 'durante' | 'pos_workshop';

export type ActivityType =
  | 'apresentacao'
  | 'dinamica_grupo'
  | 'discussao'
  | 'ideacao'
  | 'priorizacao'
  | 'break'
  | 'check_in'
  | 'wrap_up'
  | 'outro';

export type BlockType = 'atividade' | 'pausa' | 'wrap_up';

export type ParticipantProfile = 'executivos' | 'pms' | 'devs' | 'designers' | 'clientes_finais' | 'outro';

export type MaturityLevel = 'baixo' | 'medio' | 'alto';

// --- Interfaces ---

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'facilitador' | 'sponsor' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface Workshop {
  id: string;
  title: string;
  type: WorkshopType;
  clientArea: string;
  targetDate: string;
  estimatedDuration: number; // em minutos
  location: WorkshopLocation;
  status: WorkshopStatus;
  ownerId: string;
  coFacilitators: string[];
  isTemplate: boolean;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkshopContext {
  id: string;
  workshopId: string;
  businessProblem: string;
  mainObjective: string;
  expectedOutputs: string[];
  participantProfiles: ParticipantProfile[];
  maturityLevel: MaturityLevel;
  additionalNotes: string;
}

export interface AgendaBlock {
  id: string;
  workshopId: string;
  title: string;
  description: string;
  objective: string;
  duration: number; // em minutos
  blockType: BlockType;
  activityType: ActivityType;
  order: number;
  materialIds: string[];
}

export interface Turma {
  id: string;
  workshopId: string;
  name: string;
  date: string;
  time: string;
  duration: number; // em minutos
  locationType: 'presencial' | 'online';
  locationValue: string; // endereço ou link
  facilitatorId: string;
  status: TurmaStatus;
  customAgenda: boolean;
  customBlocks?: AgendaBlock[];
  materialIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  workshopId: string;
  name: string;
  type: MaterialType;
  phase: MaterialPhase;
  url?: string;
  fileName?: string;
  fileSize?: number;
  applyToAll: boolean;
  turmaIds: string[];
  createdAt: string;
}

export interface PostWorkshopFeedback {
  id: string;
  workshopId: string;
  turmaId?: string;
  adherencePercent: number; // 0-100
  whatWorked: string;
  whatToImprove: string;
  timeObservation: string;
  wouldReuse: boolean;
  createdAt: string;
}

export interface WorkshopTemplate {
  id: string;
  name: string;
  description: string;
  workshopType: WorkshopType;
  estimatedDuration: number;
  blocks: Omit<AgendaBlock, 'id' | 'workshopId'>[];
  materials: Omit<Material, 'id' | 'workshopId' | 'createdAt'>[];
  createdBy: string;
  createdAt: string;
}

// --- DTOs para formulários ---

export interface CreateWorkshopDTO {
  title: string;
  type: WorkshopType;
  clientArea: string;
  targetDate: string;
  estimatedDuration: number;
  location: WorkshopLocation;
  templateId?: string;
}

export interface UpdateWorkshopDTO extends Partial<CreateWorkshopDTO> {
  status?: WorkshopStatus;
}

export interface CreateTurmaDTO {
  workshopId: string;
  name: string;
  date: string;
  time: string;
  duration: number;
  locationType: 'presencial' | 'online';
  locationValue: string;
  facilitatorId?: string;
}

export interface CreateMaterialDTO {
  workshopId: string;
  name: string;
  type: MaterialType;
  phase: MaterialPhase;
  url?: string;
  fileName?: string;
  applyToAll: boolean;
  turmaIds: string[];
}

export interface CreateBlockDTO {
  workshopId: string;
  title: string;
  description: string;
  objective: string;
  duration: number;
  blockType: BlockType;
  activityType: ActivityType;
  order: number;
  materialIds: string[];
}

export interface CreateFeedbackDTO {
  workshopId: string;
  turmaId?: string;
  adherencePercent: number;
  whatWorked: string;
  whatToImprove: string;
  timeObservation: string;
  wouldReuse: boolean;
}

// --- Helpers ---

export const WORKSHOP_TYPE_LABELS: Record<WorkshopType, string> = {
  discovery: 'Discovery',
  ideacao: 'Ideação',
  priorizacao: 'Priorização',
  alinhamento_estrategico: 'Alinhamento Estratégico',
  design_sprint: 'Design Sprint',
  retrospectiva: 'Retrospectiva',
  kickoff: 'Kick-off',
  treinamento_tecnico: 'Treinamento Técnico',
  treinamento_produto: 'Treinamento de Produto',
  onboarding: 'Onboarding',
  venda_consultiva: 'Venda Consultiva',
  demo_produto: 'Demo de Produto',
  proposta_tecnica: 'Proposta Técnica',
  proposta_comercial: 'Proposta Comercial',
  pitch_executivo: 'Pitch Executivo',
  pitch_investidor: 'Pitch para Investidores',
  outro: 'Outro',
};

export const PRESENTATION_CATEGORY_LABELS: Record<PresentationCategory, string> = {
  workshop: 'Workshops',
  treinamento: 'Treinamentos',
  venda: 'Vendas',
  proposta: 'Propostas',
  pitch: 'Pitches',
  outro: 'Outros',
};

export const TYPE_TO_CATEGORY: Record<WorkshopType, PresentationCategory> = {
  discovery: 'workshop',
  ideacao: 'workshop',
  priorizacao: 'workshop',
  alinhamento_estrategico: 'workshop',
  design_sprint: 'workshop',
  retrospectiva: 'workshop',
  kickoff: 'workshop',
  treinamento_tecnico: 'treinamento',
  treinamento_produto: 'treinamento',
  onboarding: 'treinamento',
  venda_consultiva: 'venda',
  demo_produto: 'venda',
  proposta_tecnica: 'proposta',
  proposta_comercial: 'proposta',
  pitch_executivo: 'pitch',
  pitch_investidor: 'pitch',
  outro: 'outro',
};

export const CATEGORY_TYPES: Record<PresentationCategory, WorkshopType[]> = {
  workshop: ['discovery', 'ideacao', 'priorizacao', 'alinhamento_estrategico', 'design_sprint', 'retrospectiva', 'kickoff'],
  treinamento: ['treinamento_tecnico', 'treinamento_produto', 'onboarding'],
  venda: ['venda_consultiva', 'demo_produto'],
  proposta: ['proposta_tecnica', 'proposta_comercial'],
  pitch: ['pitch_executivo', 'pitch_investidor'],
  outro: ['outro'],
};

export const WORKSHOP_STATUS_LABELS: Record<WorkshopStatus, string> = {
  rascunho: 'Rascunho',
  em_preparacao: 'Em Preparação',
  agenda_aprovada: 'Agenda Aprovada',
  concluido: 'Concluído',
};

export const TURMA_STATUS_LABELS: Record<TurmaStatus, string> = {
  rascunho: 'Rascunho',
  em_preparacao: 'Em Preparação',
  pronta: 'Pronta',
  concluida: 'Concluída',
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  apresentacao: 'Apresentação',
  dinamica_grupo: 'Dinâmica em Grupo',
  discussao: 'Discussão',
  ideacao: 'Ideação',
  priorizacao: 'Priorização',
  break: 'Intervalo',
  check_in: 'Check-in',
  wrap_up: 'Wrap-up',
  outro: 'Outro',
};

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  atividade: 'Atividade',
  pausa: 'Pausa',
  wrap_up: 'Wrap-up',
};

export const MATERIAL_PHASE_LABELS: Record<MaterialPhase, string> = {
  pre_workshop: 'Pré-Sessão',
  durante: 'Durante',
  pos_workshop: 'Pós-Sessão',
};

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}

export function getStatusColor(status: WorkshopStatus | TurmaStatus): string {
  switch (status) {
    case 'rascunho':
      return 'bg-gray-100 text-gray-700';
    case 'em_preparacao':
      return 'bg-yellow-100 text-yellow-800';
    case 'agenda_aprovada':
    case 'pronta':
      return 'bg-green-100 text-green-800';
    case 'concluido':
    case 'concluida':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}
