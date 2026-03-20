import { create } from 'zustand';
import {
  type ForgeProject,
  type AgentId,
  type AgentRunState,
  type SlideContent,
  AGENT_PIPELINE,
  createEmptyProject,
} from './agents';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Forge Store — Motor de Geração com Agentes
// ============================================

interface ForgeState {
  // Projects
  projects: ForgeProject[];
  currentProjectId: string | null;

  // Actions
  createProject: (data: Pick<ForgeProject, 'title' | 'category' | 'briefing' | 'audience' | 'tone' | 'duration'>) => ForgeProject;
  getCurrentProject: () => ForgeProject | null;
  deleteProject: (id: string) => void;

  // Agent Pipeline
  startPipeline: (projectId: string) => void;
  updateAgentStatus: (projectId: string, agentId: AgentId, status: AgentRunState['status'], output?: string) => void;
  setAgentStarted: (projectId: string, agentId: AgentId) => void;
  setAgentDone: (projectId: string, agentId: AgentId, output: string, tokensUsed?: number) => void;
  setAgentError: (projectId: string, agentId: AgentId, error: string) => void;
  setProjectStatus: (projectId: string, status: ForgeProject['status']) => void;

  // Results
  setSlides: (projectId: string, slides: SlideContent[]) => void;
  setNarrative: (projectId: string, narrative: string) => void;
  setKeyMessages: (projectId: string, messages: string[]) => void;
  setResearchInsights: (projectId: string, insights: string[]) => void;
  setReviewFeedback: (projectId: string, feedback: string) => void;
}

// --- Seed demo project ---
const SEED_PROJECT: ForgeProject = {
  id: 'demo-001',
  title: 'Pitch: Plataforma de IA Generativa para Seguros',
  category: 'pitch',
  briefing: 'Apresentação para board executivo da Acme Insurance sobre como IA Generativa pode reduzir churn de apólices em 40%, automatizar atendimento e gerar novas receitas via cross-sell inteligente.',
  audience: 'C-Level / Board Executivo',
  tone: 'executivo',
  duration: 15,
  status: 'done',
  agents: AGENT_PIPELINE.map((agentId) => ({
    agentId,
    status: 'done' as const,
    output: '✅ Gerado com sucesso',
    startedAt: Date.now() - 60000,
    finishedAt: Date.now() - 55000,
    tokensUsed: Math.floor(Math.random() * 1500) + 500,
  })),
  slides: [
    {
      id: uuidv4(), order: 0, title: 'O Custo Invisível do Churn',
      subtitle: 'Como a Acme perde R$ 180M/ano em cancelamentos evitáveis',
      bullets: ['25% de churn anual em apólices', 'NPS em queda: de 45 para 32 no último ano', 'Custo de aquisição 5x maior que retenção'],
      speakerNotes: 'Abra com o dado impactante do R$180M. Faça uma pausa. Deixe o número assentar antes de continuar.',
      visualSuggestion: 'Número R$180M grande no centro, fundo escuro com gráfico de queda sutil',
      layoutType: 'data', duration: 60,
    },
    {
      id: uuidv4(), order: 1, title: 'IA Generativa: O Novo Paradigma',
      subtitle: 'Inteligência que prevê, previne e personaliza',
      bullets: ['Previsão de churn com 94% de acurácia', 'Atendimento personalizado 24/7 via agentes IA', 'Cross-sell inteligente com +35% conversão'],
      speakerNotes: 'Transicione: "Mas e se pudéssemos prever quem vai cancelar antes que aconteça?"',
      visualSuggestion: 'Três ícones representando previsão, personalização e conversão',
      layoutType: 'content', duration: 90,
    },
    {
      id: uuidv4(), order: 2, title: 'Resultados em 90 Dias',
      subtitle: 'Piloto com ROI comprovado',
      bullets: ['Redução de 40% no churn em 3 meses', 'Aumento de 35% em cross-sell', 'Economia de R$ 2.4M em atendimento'],
      speakerNotes: 'Estes são resultados de um piloto real com metodologia similar. Podemos replicar na Acme.',
      visualSuggestion: 'Dashboard com KPIs positivos e setas para cima',
      layoutType: 'data', duration: 90,
    },
    {
      id: uuidv4(), order: 3, title: 'Próximo Passo: PoC em 4 Semanas',
      subtitle: 'Investimento: R$ 280K → Retorno projetado: R$ 12M/ano',
      bullets: ['PoC focada em 2 personas prioritárias', 'Time dedicado de 6 especialistas', 'Go/No-Go em 30 dias com métricas claras'],
      speakerNotes: 'Feche com confiança: "Queremos começar o PoC na segunda. Precisamos apenas do seu sinal verde."',
      visualSuggestion: 'Timeline simples de 4 semanas com milestones claros',
      layoutType: 'closing', duration: 60,
    },
  ],
  narrative: 'Arco narrativo: Problema (churn caro) → Solução (IA generativa) → Prova (dados do piloto) → CTA (PoC imediata)',
  keyMessages: [
    'Churn custa R$180M/ano e é evitável com IA',
    'IA generativa prevê e previne cancelamentos com 94% de acurácia',
    'ROI comprovado: 40% menos churn em 90 dias',
    'PoC em 4 semanas com investimento baixo vs. retorno alto',
  ],
  researchInsights: [
    'McKinsey: IA pode reduzir churn em seguros em até 50%',
    'Mercado de IA em seguros: $35B até 2027 (CAGR 25%)',
    'Clientes que recebem contato proativo têm 3x mais retenção',
  ],
  reviewFeedback: '🟢 Score: 92/100 — Narrativa coesa, dados impactantes e CTA claro. Sugestão: adicionar 1 caso de sucesso com nome de empresa.',
  createdAt: '2026-03-19T10:00:00Z',
  updatedAt: '2026-03-19T10:05:00Z',
};

export const useForgeStore = create<ForgeState>((set, get) => ({
  projects: [SEED_PROJECT],
  currentProjectId: null,

  createProject: (data) => {
    const project = createEmptyProject({
      ...data,
      status: 'briefing',
    });
    set((s) => ({
      projects: [project, ...s.projects],
      currentProjectId: project.id,
    }));
    return project;
  },

  getCurrentProject: () => {
    const { projects, currentProjectId } = get();
    return projects.find((p) => p.id === currentProjectId) || null;
  },

  deleteProject: (id) => {
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
    }));
  },

  startPipeline: (projectId) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              status: 'running' as const,
              agents: p.agents.map((a) => ({ ...a, status: 'idle' as const, output: '' })),
            }
          : p
      ),
    }));
  },

  updateAgentStatus: (projectId, agentId, status, output) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              agents: p.agents.map((a) =>
                a.agentId === agentId ? { ...a, status, output: output ?? a.output } : a
              ),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    }));
  },

  setAgentStarted: (projectId, agentId) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              agents: p.agents.map((a) =>
                a.agentId === agentId ? { ...a, status: 'running' as const, startedAt: Date.now() } : a
              ),
            }
          : p
      ),
    }));
  },

  setAgentDone: (projectId, agentId, output, tokensUsed) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              agents: p.agents.map((a) =>
                a.agentId === agentId
                  ? { ...a, status: 'done' as const, output, finishedAt: Date.now(), tokensUsed }
                  : a
              ),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    }));
  },

  setAgentError: (projectId, agentId, error) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              status: 'error' as const,
              agents: p.agents.map((a) =>
                a.agentId === agentId ? { ...a, status: 'error' as const, output: error, finishedAt: Date.now() } : a
              ),
            }
          : p
      ),
    }));
  },

  setProjectStatus: (projectId, status) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, status, updatedAt: new Date().toISOString() } : p
      ),
    }));
  },

  setSlides: (projectId, slides) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, slides } : p
      ),
    }));
  },

  setNarrative: (projectId, narrative) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, narrative } : p
      ),
    }));
  },

  setKeyMessages: (projectId, messages) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, keyMessages: messages } : p
      ),
    }));
  },

  setResearchInsights: (projectId, insights) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, researchInsights: insights } : p
      ),
    }));
  },

  setReviewFeedback: (projectId, feedback) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, reviewFeedback: feedback } : p
      ),
    }));
  },
}));
