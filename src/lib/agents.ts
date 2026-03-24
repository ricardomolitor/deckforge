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

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'text' | 'document';
  size: number;
  /** Base64 data URL for image thumbnails */
  preview?: string;
  /** Extracted text content (for text/document files) */
  content?: string;
  /** User-provided description of what this reference is about */
  caption: string;
}

export interface SlideContent {
  id: string;
  order: number;
  title: string;
  subtitle?: string;
  bullets: string[];
  speakerNotes: string;
  visualSuggestion: string;
  layoutType: 'title' | 'content' | 'two-column' | 'quote' | 'data' | 'closing' | 'section-break' | 'exec-report';
  /** Structured data for exec-report layout (business case metrics) */
  execData?: {
    problema: string;
    hipotese: string;
    solucao: string;
    resultadoTangivel: string;
    resultadoIntangivel: string;
    objetivo: string;
    investimentoTotal: string;
    vpl: string;
    roiAcumulado: string;
    tir: string;
    paybackSimples: string;
    paybackDescontado: string;
    aumentoReceita: string;
    reducaoCusto: string;
    eficienciaOperacional: string;
  };
  duration?: number; // em segundos
  /** Base64 data URL for background image from reference materials */
  backgroundImage?: string;
  /** Name of the reference image assigned by the architect */
  referenceImageName?: string;
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
  attachments: Attachment[];
  /** Combined text from all attachments + captions, sent to agents */
  references: string;
  /** Raw PPTX binary as base64 — used as template for export (clone & fill) */
  templatePptxBase64?: string;
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
    color: 'text-brand-600',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-300',
    order: 0,
  },
  researcher: {
    id: 'researcher',
    name: 'Researcher',
    role: 'Analista de Dados',
    description: 'Busca dados, benchmarks, estatísticas e referências para sustentar os argumentos.',
    emoji: '🔍',
    color: 'text-brand-600',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-300',
    order: 1,
  },
  copywriter: {
    id: 'copywriter',
    name: 'Copywriter',
    role: 'Redator Persuasivo',
    description: 'Escreve títulos impactantes, bullets certeiros e textos que prendem a atenção.',
    emoji: '✍️',
    color: 'text-brand-600',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-300',
    order: 2,
  },
  'slide-architect': {
    id: 'slide-architect',
    name: 'Architect',
    role: 'Arquiteto de Slides',
    description: 'Define layout, sequência e composição visual de cada slide para máximo impacto.',
    emoji: '🏗️',
    color: 'text-brand-600',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-300',
    order: 3,
  },
  storyteller: {
    id: 'storyteller',
    name: 'Storyteller',
    role: 'Roteirista de Apresentação',
    description: 'Cria speaker notes, transições e o roteiro completo para o apresentador.',
    emoji: '🎬',
    color: 'text-brand-600',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-300',
    order: 4,
  },
  reviewer: {
    id: 'reviewer',
    name: 'Reviewer',
    role: 'Revisor Crítico',
    description: 'Analisa o resultado final, verifica coerência, impacto e sugere melhorias.',
    emoji: '🔎',
    color: 'text-brand-600',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-300',
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

// --- Helpers ---

/** Trunca texto para caber no limite do execute_agent */
function truncate(text: string, maxChars: number): string {
  if (!text || text.length <= maxChars) return text;
  return text.substring(0, maxChars) + '\n[... truncado ...]';
}

// --- Agent Prompts ---

export function buildAgentPrompt(agentId: AgentId, project: ForgeProject, previousOutputs: Record<string, string>): string {
  // Detect if a PPTX template was provided (references will contain "=== TEMPLATE PPTX BASE")
  const hasTemplate = project.references?.includes('=== TEMPLATE PPTX BASE');

  // Template gets more chars because it IS the primary input; other refs get less
  const refLimit = hasTemplate
    ? (['strategist', 'researcher'].includes(agentId) ? 8000 : 4000)
    : (['strategist', 'researcher'].includes(agentId) ? 4000 : 1500);

  const referencesBlock = project.references
    ? `\n\n${truncate(project.references, refLimit)}`
    : '';

  const templateInstruction = hasTemplate
    ? `\n\n⚠️ INSTRUÇÃO OBRIGATÓRIA: Um template PPTX foi enviado pelo usuário. Você DEVE:
1. Usar a MESMA estrutura de slides do template (mesma quantidade, mesma organização)
2. Manter os mesmos campos/seções de cada slide
3. Substituir APENAS os textos placeholder por conteúdo novo baseado no briefing
4. NÃO inventar uma estrutura nova — DERIVAR do template fornecido
5. O resultado final será aplicado diretamente sobre o arquivo PPTX original do usuário`
    : '';

  const base = `Você é o agente "${AGENTS[agentId].name}" — ${AGENTS[agentId].role}.
Contexto do projeto:
- Título: ${project.title}
- Categoria: ${project.category}
- Audiência: ${project.audience}
- Tom: ${project.tone}
- Duração: ${project.duration} minutos
- Briefing: ${project.briefing}${templateInstruction}${referencesBlock}`;

  switch (agentId) {
    case 'strategist':
      // Specialized prompt for Relatório Executivo
      if (project.category === 'relatorio-executivo') {
        return `${base}

Sua missão: Analisar o briefing e criar a ESTRATÉGIA do RELATÓRIO EXECUTIVO no padrão Avanade IT Forum.

Este é um relatório de business case estruturado. Cada caso/hipótese do briefing gera UM slide no formato "exec-report" com métricas financeiras completas.

Gere um JSON com:
{
  "narrative_arc": "visão geral: título do relatório → slides de business case por hipótese → protótipo → fechamento",
  "key_messages": ["mensagem-chave 1", "mensagem-chave 2"],
  "slide_structure": [
    {"order": 0, "type": "title", "purpose": "Capa do Relatório Executivo", "title_suggestion": "Relatório Executivo | [Cliente/Projeto] | [Tema]"},
    {"order": 1, "type": "exec-report", "purpose": "Business case da hipótese X", "title_suggestion": "[Nome do Problema]",
     "exec_data": {
       "problema": "Descrição do problema de negócio",
       "hipotese": "Hipótese testada para resolver o problema",
       "solucao": "Descrição concisa da solução proposta",
       "resultado_tangivel": "Resultado chave tangível esperado",
       "resultado_intangivel": "Resultado intangível esperado e benefícios",
       "objetivo": "Objetivo de negócio que a solução atende",
       "investimento_total": "R$ X,XX (CAPEX+OPEX)",
       "vpl": "R$ X,XX",
       "roi_acumulado": "X%",
       "tir": "X% a.a",
       "payback_simples": "Atingido/Não atingido em X anos",
       "payback_descontado": "Atingido/Não atingido em X anos",
       "aumento_receita": "X%",
       "reducao_custo": "X%",
       "eficiencia_operacional": "X%"
     }
    }
  ],
  "tone_guide": "executivo, data-driven, orientado a resultados",
  "opening_hook": "gancho impactante com dado de mercado"
}

REGRAS:
- Slide 0 = título (type "title"), depois 1 slide "exec-report" POR hipótese/caso extraído do briefing
- Se o briefing tem 3 problemas, gere 3 slides exec-report (ordem 1, 2, 3)
- Pode adicionar slide de protótipo (type "content") e fechamento (type "closing") no final
- PREENCHA exec_data com valores reais extraídos do briefing ou estimativas verossímeis baseadas no contexto
- Use dados percentuais realistas para aumento de receita, redução de custo e eficiência
- Responda APENAS o JSON, sem markdown.`;
      }

      return `${base}

Sua missão: Analisar o briefing e criar a ESTRATÉGIA NARRATIVA da apresentação.
${hasTemplate ? '\nIMPORTANTE: Baseie a estrutura de slides no TEMPLATE PPTX fornecido. Replique a mesma quantidade de slides e organização do template, substituindo os textos placeholder pelo conteúdo do briefing.\n' : ''}
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
${hasTemplate ? '- SIGA a estrutura do template PPTX fornecido (mesmos slides, mesma organização)\n- Substitua os textos placeholder por conteúdo novo derivado do briefing\n' : '- Máximo de slides = duração em minutos (1 slide por minuto em média)\n'}- Comece com gancho emocional ou dado impactante
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
      // Specialized for Relatório Executivo
      if (project.category === 'relatorio-executivo') {
        return `${base}

Estratégia: ${previousOutputs.strategist || 'N/A'}
Dados: ${previousOutputs.researcher || 'N/A'}

Sua missão: Escrever o COPY de cada slide do RELATÓRIO EXECUTIVO padrão Avanade.

A estratégia já contém exec_data com métricas de business case. Você deve PRESERVAR todos os dados e refinar o copy.

Gere um JSON com:
{
  "slides": [
    {
      "order": 0,
      "title": "Relatório Executivo | [Projeto] | [Tema]",
      "subtitle": "Avanade",
      "bullets": []
    },
    {
      "order": 1,
      "title": "[Nome do Problema]",
      "subtitle": "Hipótese testada: [hipótese refinada]",
      "bullets": ["Resultado tangível chave", "Resultado intangível e benefícios"],
      "exec_data": {
        "problema": "Texto refinado do problema",
        "hipotese": "Hipótese refinada",
        "solucao": "Descrição concisa da solução",
        "resultado_tangivel": "Resultado tangível principal",
        "resultado_intangivel": "Benefícios intangíveis",
        "objetivo": "Objetivo de negócio",
        "investimento_total": "R$ X (CAPEX+OPEX)",
        "vpl": "R$ X",
        "roi_acumulado": "X%",
        "tir": "X% a.a",
        "payback_simples": "Atingido em X anos / Não atingido em 5 anos",
        "payback_descontado": "Atingido em X anos / Não atingido em 5 anos",
        "aumento_receita": "75%",
        "reducao_custo": "7%",
        "eficiencia_operacional": "6%"
      }
    }
  ]
}

REGRAS:
- Mantenha os exec_data da estratégia. Refine textos, não invente dados.
- Slide 0 = título. Slides exec-report = mantenha exec_data completo
- Títulos curtos e impactantes (máx 8 palavras)
- Bullets = resultado tangível + intangível (máx 2)
- Responda APENAS o JSON, sem markdown.`;
      }

      return `${base}

Estratégia: ${previousOutputs.strategist || 'N/A'}
Dados: ${previousOutputs.researcher || 'N/A'}

Sua missão: Escrever o COPY de cada slide — títulos matadores e bullets certeiros.
${hasTemplate ? '\nIMPORTANTE: Siga a estrutura do TEMPLATE PPTX fornecido. Mantenha a mesma quantidade de slides e organização. Substitua os textos placeholder do template por conteúdo novo e impactante baseado no briefing e na estratégia.\n' : ''}
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
${hasTemplate ? '- SIGA a estrutura do template — mesma quantidade de slides e mesmos campos\n- Substitua TODOS os textos placeholder por conteúdo novo derivado do briefing\n' : ''}- Títulos com no máximo 8 palavras
- Bullets com no máximo 12 palavras cada
- Máximo 4 bullets por slide
- Use verbos de ação e números quando possível
- Responda APENAS o JSON, sem markdown.`;

    case 'slide-architect':
      // Build available image list for the architect to assign
      const imageList = (project.attachments || [])
        .filter((a) => a.type === 'image')
        .map((a) => `- "${a.name}"${a.caption ? ` (${a.caption})` : ''}`)
        .join('\n');
      const imageBlock = imageList
        ? `\n\nIMAGENS DE REFERÊNCIA DISPONÍVEIS (fornecidas pelo usuário como material visual):\n${imageList}\n\nIMPORTANTE: Distribua essas imagens como FUNDO dos slides mais relevantes. Cada slide pode usar uma imagem como background. Use o campo "background_image" para atribuir o nome exato do arquivo. Slides com imagem de fundo devem ter textos sobre overlay escuro.`
        : '';

      return `${base}

Estratégia: ${previousOutputs.strategist || 'N/A'}
Copy: ${previousOutputs.copywriter || 'N/A'}

Sua missão: Definir o LAYOUT e VISUAL de cada slide.${imageBlock}
${hasTemplate ? '\nIMPORTANTE: O usuário forneceu um template PPTX. O layout visual JÁ está definido no template original. Mantenha a mesma estrutura visual. O resultado será aplicado sobre o PPTX original.\n' : ''}

Gere um JSON com:
{
  "slides": [
    {
      "order": 0,
      "layout_type": "title|content|two-column|quote|data|closing|section-break",
      "visual_suggestion": "descrição da composição visual ideal",
      "background_image": "nome-do-arquivo.png ou null se não usar imagem",
      "color_accent": "cor de destaque sugerida",
      "icon_suggestion": "ícone ou ilustração sugerida"
    }
  ]
}

REGRAS:
- Alterne layouts para manter ritmo visual
- Se há imagens de referência disponíveis, USE-AS como fundo nos slides mais impactantes (título, section-break, closing)
- Slides de dados devem sugerir tipo de gráfico
- Slides de citação devem ter layout limpo
- Responda APENAS o JSON, sem markdown.`;

    case 'storyteller':
      return `${base}

Estratégia: ${truncate(previousOutputs.strategist || 'N/A', 1500)}
Copy: ${truncate(previousOutputs.copywriter || 'N/A', 3000)}
Layout: ${truncate(previousOutputs['slide-architect'] || 'N/A', 1500)}

Sua missão: Criar o ROTEIRO do apresentador — speaker notes e transições.
${hasTemplate ? '\nIMPORTANTE: Baseie o roteiro na estrutura do template PPTX fornecido. O conteúdo de cada slide segue a organização do template original.\n' : ''}

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
Estratégia: ${truncate(previousOutputs.strategist || 'N/A', 1500)}
Dados: ${truncate(previousOutputs.researcher || 'N/A', 1000)}
Copy: ${truncate(previousOutputs.copywriter || 'N/A', 2000)}
Layout: ${truncate(previousOutputs['slide-architect'] || 'N/A', 1000)}
Roteiro: ${truncate(previousOutputs.storyteller || 'N/A', 1500)}

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
    attachments: [],
    references: '',
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
