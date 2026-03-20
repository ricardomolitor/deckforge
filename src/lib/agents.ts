// ============================================
// DeckForge — Sistema de Agentes IA Especializados
// ============================================

import { v4 as uuidv4 } from 'uuid';

// --- Agent Definitions ---

export type AgentId =
  | 'strategist'
  | 'researcher'
  | 'copywriter'
  | 'slide-architect'
  | 'storyteller'
  | 'reviewer';

export type AgentStatus = 'idle' | 'running' | 'done' | 'error';

export type ForgeStatus = 'idle' | 'briefing' | 'running' | 'done' | 'error';

export interface AgentDefinition {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  order: number;
}

export interface AgentRunState {
  agentId: AgentId;
  status: AgentStatus;
  output: string;
  startedAt?: number;
  finishedAt?: number;
  tokensUsed?: number;
}

export interface SlideContent {
  id: string;
  order: number;
  title: string;
  subtitle?: string;
  bullets: string[];
  speakerNotes: string;
  visualSuggestion: string;
  layoutType: 'title' | 'content' | 'two-column' | 'quote' | 'data' | 'closing' | 'section-break';
  duration?: number; // em segundos
}

export interface ForgeProject {
  id: string;
  title: string;
  category: string;
  briefing: string;
  audience: string;
  tone: string;
  duration: number; // minutos
  status: ForgeStatus;
  agents: AgentRunState[];
  slides: SlideContent[];
  narrative: string;
  keyMessages: string[];
  researchInsights: string[];
  reviewFeedback: string;
  createdAt: string;
  updatedAt: string;
}

// --- Agent Registry ---

export const AGENTS: Record<AgentId, AgentDefinition> = {
  strategist: {
    id: 'strategist',
    name: 'Strategist',
    role: 'Estrategista de Narrativa',
    description: 'Analisa o briefing e define a estrutura narrativa, mensagens-chave e arco da apresentação.',
    emoji: '🎯',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    order: 0,
  },
  researcher: {
    id: 'researcher',
    name: 'Researcher',
    role: 'Analista de Dados',
    description: 'Busca dados, benchmarks, estatísticas e referências para sustentar os argumentos.',
    emoji: '🔍',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
    order: 1,
  },
  copywriter: {
    id: 'copywriter',
    name: 'Copywriter',
    role: 'Redator Persuasivo',
    description: 'Escreve títulos impactantes, bullets certeiros e textos que prendem a atenção.',
    emoji: '✍️',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
    order: 2,
  },
  'slide-architect': {
    id: 'slide-architect',
    name: 'Architect',
    role: 'Arquiteto de Slides',
    description: 'Define layout, sequência e composição visual de cada slide para máximo impacto.',
    emoji: '🏗️',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    order: 3,
  },
  storyteller: {
    id: 'storyteller',
    name: 'Storyteller',
    role: 'Roteirista de Apresentação',
    description: 'Cria speaker notes, transições e o roteiro completo para o apresentador.',
    emoji: '🎬',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    borderColor: 'border-pink-300',
    order: 4,
  },
  reviewer: {
    id: 'reviewer',
    name: 'Reviewer',
    role: 'Revisor Crítico',
    description: 'Analisa o resultado final, verifica coerência, impacto e sugere melhorias.',
    emoji: '🔎',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    order: 5,
  },
};

export const AGENT_PIPELINE: AgentId[] = [
  'strategist',
  'researcher',
  'copywriter',
  'slide-architect',
  'storyteller',
  'reviewer',
];

// --- Agent Prompts ---

export function buildAgentPrompt(agentId: AgentId, project: ForgeProject, previousOutputs: Record<string, string>): string {
  const base = `Você é o agente "${AGENTS[agentId].name}" — ${AGENTS[agentId].role}.
Contexto do projeto:
- Título: ${project.title}
- Categoria: ${project.category}
- Audiência: ${project.audience}
- Tom: ${project.tone}
- Duração: ${project.duration} minutos
- Briefing: ${project.briefing}`;

  switch (agentId) {
    case 'strategist':
      return `${base}

Sua missão: Analisar o briefing e criar a ESTRATÉGIA NARRATIVA da apresentação.

Gere um JSON com:
{
  "narrative_arc": "descrição do arco narrativo (problema → solução → valor → call-to-action)",
  "key_messages": ["mensagem-chave 1", "mensagem-chave 2", ...],
  "slide_structure": [
    {"order": 0, "type": "title|content|data|quote|section-break|two-column|closing", "purpose": "objetivo do slide", "title_suggestion": "sugestão de título"}
  ],
  "tone_guide": "guia de tom e linguagem",
  "opening_hook": "sugestão de gancho de abertura impactante"
}

REGRAS:
- Máximo de slides = duração em minutos (1 slide por minuto em média)
- Comece com gancho emocional ou dado impactante
- Termine com call-to-action claro
- Responda APENAS o JSON, sem markdown.`;

    case 'researcher':
      return `${base}

Estratégia definida pelo Strategist:
${previousOutputs.strategist || 'Não disponível'}

Sua missão: Fornecer DADOS e INSIGHTS para sustentar a narrativa.

Gere um JSON com:
{
  "insights": [
    {"fact": "dado ou estatística relevante", "source": "fonte sugerida", "slide_index": 0}
  ],
  "benchmarks": ["benchmark 1", "benchmark 2"],
  "market_data": "contexto de mercado relevante",
  "competitor_angles": "ângulos competitivos para explorar"
}

REGRAS:
- Dados devem ser verossímeis e relevantes
- Inclua ao menos 1 insight por slide de conteúdo
- Responda APENAS o JSON, sem markdown.`;

    case 'copywriter':
      return `${base}

Estratégia: ${previousOutputs.strategist || 'N/A'}
Dados: ${previousOutputs.researcher || 'N/A'}

Sua missão: Escrever o COPY de cada slide — títulos matadores e bullets certeiros.

Gere um JSON com:
{
  "slides": [
    {
      "order": 0,
      "title": "Título impactante do slide",
      "subtitle": "Subtítulo opcional",
      "bullets": ["Bullet conciso e impactante 1", "Bullet 2"],
      "cta": "call-to-action se aplicável"
    }
  ]
}

REGRAS:
- Títulos com no máximo 8 palavras
- Bullets com no máximo 12 palavras cada
- Máximo 4 bullets por slide
- Use verbos de ação e números quando possível
- Responda APENAS o JSON, sem markdown.`;

    case 'slide-architect':
      return `${base}

Estratégia: ${previousOutputs.strategist || 'N/A'}
Copy: ${previousOutputs.copywriter || 'N/A'}

Sua missão: Definir o LAYOUT e VISUAL de cada slide.

Gere um JSON com:
{
  "slides": [
    {
      "order": 0,
      "layout_type": "title|content|two-column|quote|data|closing|section-break",
      "visual_suggestion": "descrição da composição visual ideal",
      "color_accent": "cor de destaque sugerida",
      "icon_suggestion": "ícone ou ilustração sugerida"
    }
  ]
}

REGRAS:
- Alterne layouts para manter ritmo visual
- Slides de dados devem sugerir tipo de gráfico
- Slides de citação devem ter layout limpo
- Responda APENAS o JSON, sem markdown.`;

    case 'storyteller':
      return `${base}

Estratégia: ${previousOutputs.strategist || 'N/A'}
Copy: ${previousOutputs.copywriter || 'N/A'}
Layout: ${previousOutputs['slide-architect'] || 'N/A'}

Sua missão: Criar o ROTEIRO do apresentador — speaker notes e transições.

Gere um JSON com:
{
  "slides": [
    {
      "order": 0,
      "speaker_notes": "O que o apresentador deve falar neste slide (2-4 frases)",
      "transition": "Como fazer a transição para o próximo slide",
      "duration_seconds": 60,
      "tip": "Dica de apresentação"
    }
  ],
  "opening_script": "Script de abertura (30 segundos)",
  "closing_script": "Script de fechamento com CTA"
}

REGRAS:
- Notes devem soar naturais, não robóticas
- Cada slide deve respeitar a duração proporcional
- Inclua pausas dramáticas e perguntas retóricas
- Responda APENAS o JSON, sem markdown.`;

    case 'reviewer':
      return `${base}

Outputs de todos os agentes:
Estratégia: ${previousOutputs.strategist || 'N/A'}
Dados: ${previousOutputs.researcher || 'N/A'}
Copy: ${previousOutputs.copywriter || 'N/A'}
Layout: ${previousOutputs['slide-architect'] || 'N/A'}
Roteiro: ${previousOutputs.storyteller || 'N/A'}

Sua missão: REVISAR e dar score final da apresentação.

Gere um JSON com:
{
  "overall_score": 85,
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "improvements": ["sugestão de melhoria 1", "sugestão 2"],
  "coherence_check": "OK|ISSUE: descrição",
  "impact_assessment": "Alta|Média|Baixa — justificativa",
  "final_verdict": "Resumo em 1 frase do veredito final"
}

REGRAS:
- Seja honesto e construtivo
- Score de 0 a 100
- Identifique inconsistências entre slides
- Responda APENAS o JSON, sem markdown.`;

    default:
      return base;
  }
}

// --- Tone Options ---

export const TONE_OPTIONS = [
  { value: 'executivo', label: '🏢 Executivo — Formal e direto ao ponto' },
  { value: 'inspirador', label: '🚀 Inspirador — Motivacional e visionário' },
  { value: 'tecnico', label: '⚙️ Técnico — Detalhado e preciso' },
  { value: 'consultivo', label: '🤝 Consultivo — Empático e solucionador' },
  { value: 'criativo', label: '🎨 Criativo — Ousado e disruptivo' },
  { value: 'educativo', label: '📚 Educativo — Didático e acessível' },
];

export const AUDIENCE_SUGGESTIONS = [
  'C-Level / Board Executivo',
  'Gerentes e Diretores',
  'Product Managers e POs',
  'Desenvolvedores e Técnicos',
  'Equipe Comercial',
  'Clientes / Prospects',
  'Investidores',
  'Time Interno',
  'Participantes de Workshop',
];

// --- Duration Presets ---

export const DURATION_PRESETS = [
  { value: 5, label: '⚡ 5 min — Lightning talk' },
  { value: 10, label: '🎯 10 min — Pitch rápido' },
  { value: 15, label: '📊 15 min — Apresentação curta' },
  { value: 30, label: '🎤 30 min — Apresentação padrão' },
  { value: 60, label: '📋 60 min — Sessão completa' },
  { value: 90, label: '🏋️ 90 min — Workshop / Treinamento' },
  { value: 120, label: '🎓 2h — Treinamento intensivo' },
  { value: 240, label: '📅 4h — Meio dia' },
  { value: 480, label: '🗓️ 8h — Dia inteiro' },
];

// --- Helpers ---

export function createEmptyProject(overrides?: Partial<ForgeProject>): ForgeProject {
  return {
    id: uuidv4(),
    title: '',
    category: '',
    briefing: '',
    audience: '',
    tone: 'executivo',
    duration: 30,
    status: 'idle',
    agents: AGENT_PIPELINE.map((agentId) => ({
      agentId,
      status: 'idle',
      output: '',
    })),
    slides: [],
    narrative: '',
    keyMessages: [],
    researchInsights: [],
    reviewFeedback: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function getAgentElapsedTime(agent: AgentRunState): string {
  if (!agent.startedAt) return '';
  const end = agent.finishedAt || Date.now();
  const secs = Math.round((end - agent.startedAt) / 1000);
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m${secs % 60}s`;
}

export function getProjectProgress(project: ForgeProject): number {
  const done = project.agents.filter((a) => a.status === 'done').length;
  return Math.round((done / project.agents.length) * 100);
}
