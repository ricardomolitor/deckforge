// ============================================
// DeckForge — Sistema de Agentes IA Especializados v2
// Pipeline: content-planner → researcher → copywriter → designer → storyteller → quality-reviewer → finalizer
// ============================================

import { v4 as uuidv4 } from 'uuid';
import { getTemplateCatalogPrompt, getExecReportCatalogPrompt } from './template-catalog';

// --- Agent Definitions ---

export type AgentId =
  | 'content-planner'
  | 'researcher'
  | 'copywriter'
  | 'designer'
  | 'storyteller'
  | 'quality-reviewer'
  | 'finalizer';

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
  /** Template layout identifier from the Avanade catalog */
  layout_id?: string;
  /** Field values for template text replacement */
  fields?: Record<string, string>;
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
  'content-planner': {
    id: 'content-planner',
    name: 'Content Planner',
    role: 'Planejador de Conteúdo',
    description: 'Analisa briefing + template e cria um plano detalhado: quantos slides, o que vai em cada um, quando dividir tópicos complexos.',
    emoji: '📋',
    color: 'text-brand-600',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-300',
    order: 0,
  },
  researcher: {
    id: 'researcher',
    name: 'Researcher',
    role: 'Analista de Dados e Mercado',
    description: 'Enriquece o plano com dados reais, benchmarks, estatísticas e casos de uso que tornam a apresentação irrefutável.',
    emoji: '🔍',
    color: 'text-brand-600',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-300',
    order: 1,
  },
  copywriter: {
    id: 'copywriter',
    name: 'Copywriter',
    role: 'Redator Criativo',
    description: 'Escreve TODOS os textos de cada slide — títulos, subtítulos, bullets, callouts — com impacto máximo.',
    emoji: '✍️',
    color: 'text-brand-600',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-300',
    order: 2,
  },
  designer: {
    id: 'designer',
    name: 'Designer',
    role: 'Designer de Apresentação',
    description: 'Define layout visual, paleta de cores, ícones e composição de cada slide como um designer sênior.',
    emoji: '🎨',
    color: 'text-brand-600',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-300',
    order: 3,
  },
  storyteller: {
    id: 'storyteller',
    name: 'Storyteller',
    role: 'Roteirista e Diretor de Narrativa',
    description: 'Cria speaker notes, transições e timing — faz a apresentação soar como uma TED Talk.',
    emoji: '🎬',
    color: 'text-brand-600',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-300',
    order: 4,
  },
  'quality-reviewer': {
    id: 'quality-reviewer',
    name: 'Quality Reviewer',
    role: 'Diretor de Qualidade',
    description: 'Revisa tudo, verifica coerência, identifica slides fracos e sugere melhorias específicas.',
    emoji: '🔎',
    color: 'text-brand-600',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-300',
    order: 5,
  },
  finalizer: {
    id: 'finalizer',
    name: 'Finalizer',
    role: 'Finalizador',
    description: 'Funde copy + design + storytelling em um deck final limpo, completo e pronto para exportar.',
    emoji: '🏁',
    color: 'text-brand-600',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-300',
    order: 6,
  },
};

export const AGENT_PIPELINE: AgentId[] = [
  'content-planner',
  'researcher',
  'copywriter',
  'designer',
  'storyteller',
  'quality-reviewer',
  'finalizer',
];

// --- Helpers ---

/** Trunca texto para caber no limite do execute_agent (~14K char input) */
function truncate(text: string, maxChars: number): string {
  if (!text || text.length <= maxChars) return text;
  return text.substring(0, maxChars) + '\n[... truncado ...]';
}

// --- Agent Prompts ---

export function buildAgentPrompt(agentId: AgentId, project: ForgeProject, previousOutputs: Record<string, string>): string {
  // The system ALWAYS uses a template — inject the correct catalog knowledge
  const templateCatalog = project.category === 'relatorio-executivo'
    ? getExecReportCatalogPrompt()
    : getTemplateCatalogPrompt();

  // Detect if user also uploaded a custom PPTX (references will contain "=== TEMPLATE PPTX BASE")
  const hasCustomTemplate = project.references?.includes('=== TEMPLATE PPTX BASE');

  const refLimit = (['content-planner', 'researcher'].includes(agentId) ? 4000 : 1500);

  const referencesBlock = project.references
    ? `\n\n${truncate(project.references, refLimit)}`
    : '';

  // All agents receive the template catalog — this is the STANDARD Avanade template
  const templateInstruction = templateCatalog;

  // Persona descriptions for each agent — vivid, not just role titles
  const personas: Record<AgentId, string> = {
    'content-planner': `Você é um consultor sênior de apresentações com 20 anos de experiência em McKinsey e TEDx. Você sabe exatamente quando um assunto precisa de 1 slide vs 3, quando inserir uma pausa narrativa, e como transformar um briefing confuso em uma estrutura cristalina. Você pensa como um diretor de cinema planejando cenas.`,
    researcher: `Você é um analista de inteligência de mercado obsessivo por dados. Você não aceita afirmações sem números. Cada insight que você produz vem com contexto, fonte plausível e relevância direta para o argumento do slide. Você transforma apresentações genéricas em apresentações irrefutáveis.`,
    copywriter: `Você é um redator premiado que já escreveu para Apple, Nike e as melhores agências do mundo. Cada título seu é memorável. Cada bullet é uma flecha — curta, precisa, impossível de ignorar. Você escreve como se cada palavra custasse R$1.000 e o cliente exigisse retorno sobre cada uma.`,
    designer: `Você é um designer sênior de apresentações que trabalhou com Pentagram e IDEO. Você pensa em hierarquia visual, espaço negativo, ritmo de layouts. Você sabe que uma apresentação é uma EXPERIÊNCIA VISUAL — não um documento de texto com fundo bonito. Cada slide seu tem intenção de design clara.`,
    storyteller: `Você é um roteirista e coach de TED Talks. Você sabe criar tensão, usar pausas, conectar slides com transições que mantêm a audiência hipnotizada. Suas speaker notes transformam qualquer pessoa em um apresentador magnético.`,
    'quality-reviewer': `Você é um diretor de qualidade implacável. Você encontra inconsistências que ninguém vê, identifica slides fracos, verifica se a narrativa flui, e dá feedback cirúrgico. Você não aceita "bom o suficiente" — você exige excelência.`,
    finalizer: `Você é um produtor executivo que pega o trabalho de uma equipe inteira e entrega o produto final perfeito. Você funde textos, design e storytelling em um deck coeso, resolve conflitos entre agentes, e garante que cada slide está completo e pronto para apresentar sem nenhuma correção humana.`,
  };

  const base = `${personas[agentId]}

Você é o agente "${AGENTS[agentId].name}" — ${AGENTS[agentId].role}.
Contexto do projeto:
- Título: ${project.title}
- Categoria: ${project.category}
- Audiência: ${project.audience}
- Tom: ${project.tone}
- Duração: ${project.duration} minutos
- Briefing: ${project.briefing}${templateInstruction}${referencesBlock}`;

  switch (agentId) {
    // =============================================
    // 1. CONTENT PLANNER
    // =============================================
    case 'content-planner': {
      // Specialized for Relatório Executivo
      if (project.category === 'relatorio-executivo') {
        return `${base}

Sua missão: Analisar o briefing e criar o PLANO DE CONTEÚDO do RELATÓRIO EXECUTIVO.

O sistema usa OBRIGATORIAMENTE o template "Relatório Executivo - IT Forum.pptx".
Cada hipótese/caso do briefing gera UM slide "er-dashboard" (duplicação automática).

Gere um JSON com:
{
  "presentation_concept": "conceito em uma frase do relatório",
  "target_outcome": "o que o board deve DECIDIR/APROVAR após ver isto",
  "slide_plan": [
    {
      "order": 0,
      "layout_id": "er-cover",
      "purpose": "Capa do Relatório Executivo",
      "key_message": "Título impactante",
      "fields": {
        "title": "Relatório Executivo",
        "client": "[Nome do Cliente ou Programa]",
        "experience": "[Nome da Experiência ou Evento]"
      }
    },
    {
      "order": 1,
      "layout_id": "er-dashboard",
      "purpose": "Business case da hipótese X",
      "key_message": "Problema → Solução → ROI",
      "fields": {
        "scenario": "CENÁRIO CONSERVADOR",
        "case_name": "[Nome do Case — máx 8 palavras]",
        "resultado_tangivel": "[Resultado chave tangível esperado]",
        "resultado_intangivel": "[Resultado chave intangível esperado e benefícios]",
        "aumento_receita": "X%",
        "reducao_custo": "X%",
        "eficiencia": "X%",
        "investimento": "R$X.XM",
        "roi": "X%",
        "vpl": "R$X.XM",
        "tir": "X%",
        "hipotese": "[Descrição da hipótese testada para resolver o problema]"
      },
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
    },
    {
      "order": N-1,
      "layout_id": "er-prototype",
      "purpose": "Demo/Protótipo (opcional)",
      "key_message": "Demonstração da solução",
      "fields": {"title": "Protótipo", "demo": "[Descrição]"}
    },
    {
      "order": N,
      "layout_id": "er-closing",
      "purpose": "Encerramento",
      "key_message": "",
      "fields": {}
    }
  ],
  "narrative_arc": "capa → business cases por hipótese → protótipo → fechamento",
  "tone_guide": "executivo, data-driven, orientado a resultados"
}

REGRAS:
- Slide 0 = "er-cover", depois 1 slide "er-dashboard" POR hipótese/caso extraído do briefing
- Se o briefing tem 3 problemas, gere 3 slides er-dashboard (ordem 1, 2, 3)
- Pode adicionar slide "er-prototype" e "er-closing" no final
- PREENCHA fields com valores reais extraídos do briefing ou estimativas verossímeis
- exec_data e fields DEVEM ter os mesmos valores (um é para UI, outro para o template)
- Responda APENAS o JSON, sem markdown.`;
      }

      return `${base}

Sua missão: Analisar o briefing e criar um PLANO DE CONTEÚDO usando o template Avanade padrão.
O sistema vai CLONAR slides do template e substituir textos — como um humano editaria o PowerPoint.

Você ESCOLHE quais layouts usar do catálogo e define o conteúdo de cada slide.

Gere um JSON com:
{
  "presentation_concept": "conceito em uma frase poderosa",
  "target_outcome": "o que a audiência deve FAZER/SENTIR/DECIDIR após ver esta apresentação",
  "slide_plan": [
    {"order": 0, "layout_id": "cover", "purpose": "Capa da apresentação", "key_message": "Título impactante", "fields": {"title": "Título Principal", "subtitle": "Subtítulo ou contexto"}},
    {"order": 1, "layout_id": "agenda", "purpose": "Roadmap da apresentação", "key_message": "O que vamos cobrir", "fields": {"section_1_heading": "Contexto", "section_1_sub": "...", "section_2_heading": "Solução", "section_2_sub": "..."}},
    {"order": 2, "layout_id": "section-divider", "purpose": "Transição visual", "key_message": "Frase de impacto", "fields": {"number": "01.", "heading": "Contexto do Problema", "body": "Breve descrição"}},
    {"order": 3, "layout_id": "content-2col", "purpose": "Detalhamento do problema", "key_message": "Dor da audiência", "fields": {"title": "O Desafio Atual", "header2": "Dados chave", "body": "Texto detalhado"}},
    {"order": 4, "layout_id": "numbers", "purpose": "Métricas de impacto", "key_message": "ROI e KPIs", "fields": {"title": "Resultados Esperados", "metrics": "35%"}},
    {"order": 5, "layout_id": "grid-4cards", "purpose": "4 benefícios", "key_message": "Valor da solução", "fields": {"title": "Por que agora?", "card1_heading": "...", "card1_body": "...", "card2_heading": "...", "card2_body": "...", "card3_heading": "...", "card3_body": "...", "card4_heading": "...", "card4_body": "..."}},
    {"order": 6, "layout_id": "closing", "purpose": "Encerramento Avanade", "key_message": "Do what matters", "fields": {}}
  ],
  "narrative_arc": "gancho → problema → evidência → solução → prova → visão → CTA",
  "tone_guide": "guia de tom para todos os agentes"
}

REGRAS:
- SEMPRE comece com layout_id="cover" e termine com layout_id="closing"
- Use "section-divider" para separar blocos temáticos (dá ritmo visual profissional)
- Layouts duplicáveis podem ser repetidos (ex: 2x "content-2col" para 2 tópicos)
- TEXTOS CURTOS: títulos ≤6 palavras, body ≤50 palavras — o template tem espaço limitado
- Os "fields" devem conter EXATAMENTE os fieldIds do catálogo
- Duração ~${project.duration} minutos (~1 slide/minuto como guia)
- Se o briefing tem dados numéricos, USE o layout "numbers" ou "dashboard-kpi"
- Se o briefing tem comparações, USE "comparison-5col" ou "table"
- Responda APENAS o JSON, sem markdown.`;
    }

    // =============================================
    // 2. RESEARCHER
    // =============================================
    case 'researcher':
      return `${base}

Plano de Conteúdo definido pelo Content Planner:
${truncate(previousOutputs['content-planner'] || 'Não disponível', 2000)}

Sua missão: ENRIQUECER o plano com dados concretos, benchmarks e evidências.

Gere um JSON com:
{
  "insights": [
    {"fact": "dado ou estatística concreta e específica", "source": "fonte plausível (Gartner, McKinsey, IDC, etc.)", "slide_order": 2, "impact": "como este dado fortalece o argumento do slide"}
  ],
  "benchmarks": [
    {"metric": "métrica comparativa", "value": "valor", "context": "por que isso importa"}
  ],
  "market_data": "contexto macro de mercado em 2-3 frases",
  "competitor_angles": "ângulos competitivos ou diferenciais para explorar",
  "suggested_callouts": [
    {"slide_order": 2, "callout": "frase de impacto baseada em dados para destacar no slide"}
  ]
}

CRITÉRIOS DE QUALIDADE:
- Todo dado deve ser ESPECÍFICO (não "empresas que usam IA crescem mais" → "67% das empresas Fortune 500 que adotaram IA generativa reportaram aumento de 23% em produtividade — Gartner 2025")
- Inclua ao menos 1 insight para cada slide com needs_data=true no plano
- Benchmarks devem ser comparativos (antes/depois, com/sem, setor A vs B)
- Callouts devem ser frases curtas e memoráveis baseadas nos dados
- Responda APENAS o JSON, sem markdown.`;

    // =============================================
    // 3. COPYWRITER
    // =============================================
    case 'copywriter': {
      // Specialized for Relatório Executivo
      if (project.category === 'relatorio-executivo') {
        return `${base}

Plano: ${truncate(previousOutputs['content-planner'] || 'N/A', 2000)}
Dados: ${truncate(previousOutputs.researcher || 'N/A', 1500)}

Sua missão: Escrever o COPY de cada slide do RELATÓRIO EXECUTIVO usando o template "Relatório Executivo - IT Forum".

O plano já contém fields e exec_data com métricas de business case. Você deve PRESERVAR todos os dados e REFINAR o copy.

Gere um JSON com:
{
  "slides": [
    {
      "order": 0,
      "layout_id": "er-cover",
      "title": "Relatório Executivo",
      "subtitle": "[Nome do Projeto]",
      "bullets": [],
      "fields": {"title": "Relatório Executivo", "client": "[Nome do Cliente]", "experience": "[Nome da Experiência]"}
    },
    {
      "order": 1,
      "layout_id": "er-dashboard",
      "title": "[Nome do Case — máx 8 palavras]",
      "subtitle": "Hipótese: [hipótese refinada]",
      "bullets": ["Resultado tangível chave", "Benefícios intangíveis"],
      "fields": {
        "scenario": "CENÁRIO CONSERVADOR",
        "case_name": "[Nome do Case refinado e impactante]",
        "resultado_tangivel": "[Resultado tangível principal — máx 12 palavras]",
        "resultado_intangivel": "[Resultado intangível e benefícios — máx 15 palavras]",
        "aumento_receita": "X%",
        "reducao_custo": "X%",
        "eficiencia": "X%",
        "investimento": "R$X.XM",
        "roi": "X%",
        "vpl": "R$X.XM",
        "tir": "X%",
        "hipotese": "[Hipótese refinada — máx 25 palavras]"
      },
      "exec_data": {
        "problema": "Texto refinado e impactante do problema",
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
        "aumento_receita": "X%",
        "reducao_custo": "X%",
        "eficiencia_operacional": "X%"
      }
    }
  ]
}

REGRAS:
- Mantenha os exec_data e fields do plano. Refine textos, não invente dados.
- fields e exec_data devem ter VALORES CONSISTENTES
- Slide 0 = er-cover. Slides er-dashboard = mantenha exec_data + fields completos
- case_name no fields deve ser impactante (máx 8 palavras)
- resultado_tangivel e resultado_intangivel: frases curtas e mensuráveis
- Responda APENAS o JSON, sem markdown.`;
      }

      return `${base}

Plano de Conteúdo: ${truncate(previousOutputs['content-planner'] || 'N/A', 2000)}
Dados e Insights: ${truncate(previousOutputs.researcher || 'N/A', 1500)}

Sua missão: Escrever TODO o texto de cada slide — títulos, subtítulos, bullets, callouts e CTAs.

Imagine que você está escrevendo para UMA PESSOA ESPECÍFICA na audiência (${project.audience}). Fale diretamente com ela.

Gere um JSON com:
{
  "slides": [
    {
      "order": 0,
      "title": "Título memorável — 3 a 8 palavras que grudam na mente",
      "subtitle": "Subtítulo que complementa ou contextualiza",
      "bullets": ["Bullet conciso com verbo de ação", "Cada bullet = 1 ideia = máx 12 palavras"],
      "callout": "Frase de destaque para box visual (opcional)",
      "cta": "Call-to-action específico (opcional, geralmente no último slide)"
    }
  ]
}

CRITÉRIOS DE QUALIDADE:
- TÍTULOS: Memoráveis, provocativos ou surpreendentes. Nunca genéricos ("Conclusão", "Agenda", "Próximos Passos"). Prefira "3 Decisões Que Definem Seu Q4" a "Próximos Passos"
- BULLETS: Cada um começa com verbo de ação ou número. Máximo 4 por slide. Se precisar de mais, o slide deve ser dividido (sinalize isso)
- CALLOUTS: Frases de 1 linha que funcionam sozinhas — tipo headline de jornal ou post viral
- SUBTÍTULOS: Contextualizam sem repetir o título
- CTAs: Específicos e acionáveis ("Agende uma POC de 2 semanas" vs "Entre em contato")
- Use dados do Researcher quando disponíveis — números vendem
- Tom: ${project.tone}
- Responda APENAS o JSON, sem markdown.`;
    }

    // =============================================
    // 4. DESIGNER
    // =============================================
    case 'designer': {
      // Build available image list for the designer to assign
      const imageList = (project.attachments || [])
        .filter((a) => a.type === 'image')
        .map((a) => `- "${a.name}"${a.caption ? ` (${a.caption})` : ''}`)
        .join('\n');
      const imageBlock = imageList
        ? `\n\nIMAGENS DE REFERÊNCIA DISPONÍVEIS (material visual do usuário):\n${imageList}\n\nDistribua essas imagens como FUNDO dos slides mais impactantes. Use o campo "background_image" com o nome exato do arquivo. Slides com imagem de fundo devem usar overlay escuro para legibilidade.`
        : '';

      return `${base}

Plano: ${truncate(previousOutputs['content-planner'] || 'N/A', 1500)}
Copy: ${truncate(previousOutputs.copywriter || 'N/A', 2000)}${imageBlock}


Sua missão: Definir o DESIGN VISUAL de cada slide como um designer sênior.

Gere um JSON com:
{
  "slides": [
    {
      "order": 0,
      "layout_type": "title",
      "visual_notes": "Descrição precisa da composição visual: hierarquia de elementos, espaçamento, posição de texto",
      "color_accent": "#HEX cor de destaque para este slide",
      "icon_suggestion": "Ícone ou ilustração específica (ex: 'gráfico de barras ascendente', 'ícone de escudo')",
      "background_image": null
    }
  ],
  "design_system": {
    "primary_color": "#FF6900 — cor principal (use a cor do template se disponível, senão Avanade orange)",
    "accent_color": "#2B2B2B — cor de destaque/contraste (use a cor do template se disponível)",
    "font_style": "modern|classic|bold",
    "visual_theme": "Descrição do tema visual (ex: 'Avanade corporate com toques de laranja e fundo escuro')"
  }
}

TIPOS DE LAYOUT: title, content, two-column, quote, data, closing, section-break
(Use estes nomes exatos no campo layout_type)

CRITÉRIOS DE QUALIDADE:
- RITMO VISUAL: Alterne layouts — nunca 3 slides "content" seguidos. Intercale com quote, data, two-column
- HIERARQUIA: Cada slide deve ter 1 elemento dominante (título grande OU dado em destaque OU imagem)
- ESPAÇO NEGATIVO: Menos é mais. Se o copy tem 5 bullets, sugira two-column para não amontoar
- DADOS: Slides de dados devem sugerir tipo de gráfico específico (barra, pizza, linha, donut)
- CORES: Use accent colors com propósito — para destacar números, CTAs ou mudanças de seção
- CONSISTÊNCIA: O design_system deve ser coerente em toda a apresentação
- Responda APENAS o JSON, sem markdown.`;
    }

    // =============================================
    // 5. STORYTELLER
    // =============================================
    case 'storyteller':
      return `${base}

Plano: ${truncate(previousOutputs['content-planner'] || 'N/A', 1500)}
Copy: ${truncate(previousOutputs.copywriter || 'N/A', 2000)}
Design: ${truncate(previousOutputs.designer || 'N/A', 1500)}

Sua missão: Criar o ROTEIRO COMPLETO do apresentador — speaker notes, transições e timing.


Gere um JSON com:
{
  "slides": [
    {
      "order": 0,
      "speaker_notes": "O que o apresentador deve FALAR neste slide (3-5 frases naturais, como se estivesse conversando com a audiência)",
      "transition": "Frase exata de transição para o próximo slide (ex: 'E isso nos leva à pergunta que todos estão fazendo...')",
      "duration_seconds": 60,
      "tip": "Dica de performance (ex: 'Faça contato visual com o decisor antes de revelar o número')",
      "dramatic_pause": false
    }
  ],
  "opening_script": "Script de abertura — primeiros 30 segundos que definem o tom da apresentação",
  "closing_script": "Script de fechamento com CTA emocional e racional"
}

CRITÉRIOS DE QUALIDADE:
- NATURALIDADE: Notes devem soar como FALA, não como texto lido. Use contrações, perguntas retóricas, pausas
- TRANSIÇÕES: Cada transição deve criar curiosidade sobre o próximo slide ("Mas aqui vem a surpresa...")
- TIMING: Distribua a duração proporcionalmente — slides de dados levam mais tempo, section-breaks são rápidos
- RITMO: Alterne momentos de energia alta (dados impactantes, CTAs) com momentos reflexivos (histórias, perguntas)
- PAUSAS: Marque dramatic_pause=true em momentos-chave (após revelar dado chocante, antes do CTA)
- Duração total deve somar aproximadamente ${project.duration * 60} segundos
- Responda APENAS o JSON, sem markdown.`;

    // =============================================
    // 6. QUALITY REVIEWER
    // =============================================
    case 'quality-reviewer':
      return `${base}

Outputs de todos os agentes anteriores:
Plano: ${truncate(previousOutputs['content-planner'] || 'N/A', 1000)}
Dados: ${truncate(previousOutputs.researcher || 'N/A', 800)}
Copy: ${truncate(previousOutputs.copywriter || 'N/A', 1500)}
Design: ${truncate(previousOutputs.designer || 'N/A', 800)}
Roteiro: ${truncate(previousOutputs.storyteller || 'N/A', 1000)}

Sua missão: REVISAR IMPIEDOSAMENTE e dar feedback específico.

Gere um JSON com:
{
  "overall_score": 85,
  "strengths": ["ponto forte específico 1", "ponto forte específico 2"],
  "critical_issues": [
    {"slide_order": 2, "issue": "descrição precisa do problema", "fix": "solução específica para o finalizer aplicar"}
  ],
  "improvements": [
    {"slide_order": 0, "current": "o que está agora", "suggested": "o que deveria ser", "reason": "por quê"}
  ],
  "coherence_check": "OK ou descrição de inconsistências entre slides/agentes",
  "narrative_flow": "OK ou problemas de fluxo narrativo",
  "impact_assessment": "Alta|Média|Baixa — justificativa em 1 frase",
  "final_verdict": "Resumo executivo em 2 frases: o que está bom e o que o finalizer DEVE corrigir"
}

CRITÉRIOS DE AVALIAÇÃO:
- COERÊNCIA: A narrativa flui logicamente do slide 1 ao último?
- IMPACTO: Os títulos são memoráveis ou genéricos?
- DADOS: Os números estão bem distribuídos e contextualizados?
- DESIGN: Os layouts variam ou são monótonos?
- STORYTELLING: As transições criam interesse ou são mecânicas?
- AUDIÊNCIA: O tom é adequado para ${project.audience}?
- Score de 0 a 100 (seja honesto — 90+ só para trabalho excepcional)
- Responda APENAS o JSON, sem markdown.`;

    // =============================================
    // 7. FINALIZER
    // =============================================
    case 'finalizer': {

      // Specialized finalizer for Relatório Executivo
      if (project.category === 'relatorio-executivo') {
        return `${base}

Você é o ÚLTIMO agente. Sua missão é FUNDIR todos os outputs anteriores no RELATÓRIO EXECUTIVO FINAL.

Copy (textos): ${truncate(previousOutputs.copywriter || 'N/A', 2000)}
Design (visual): ${truncate(previousOutputs.designer || 'N/A', 1500)}
Roteiro (speaker notes): ${truncate(previousOutputs.storyteller || 'N/A', 1500)}
Revisão (correções): ${truncate(previousOutputs['quality-reviewer'] || 'N/A', 1000)}

APLIQUE as correções do quality-reviewer. CORRIJA os problemas identificados.

O template "Relatório Executivo - IT Forum" tem 4 layouts: er-cover, er-dashboard, er-prototype, er-closing.

Gere um JSON com o deck COMPLETO e FINAL:
{
  "slides": [
    {
      "order": 0,
      "layout_id": "er-cover",
      "title": "Relatório Executivo",
      "subtitle": "",
      "bullets": [],
      "speakerNotes": "Speaker notes naturais para a abertura",
      "fields": {"title": "Relatório Executivo", "client": "[Nome do Cliente]", "experience": "[Experiência/Projeto]"},
      "duration": 30
    },
    {
      "order": 1,
      "layout_id": "er-dashboard",
      "title": "[Nome do Case]",
      "subtitle": "",
      "bullets": ["Resultado tangível", "Resultado intangível"],
      "speakerNotes": "Speaker notes com métricas e contexto",
      "fields": {
        "scenario": "CENÁRIO CONSERVADOR",
        "case_name": "[Nome do Case]",
        "resultado_tangivel": "[Resultado tangível principal]",
        "resultado_intangivel": "[Resultado intangível e benefícios]",
        "aumento_receita": "X%",
        "reducao_custo": "X%",
        "eficiencia": "X%",
        "investimento": "R$X.XM",
        "roi": "X%",
        "vpl": "R$X.XM",
        "tir": "X%",
        "hipotese": "[Hipótese testada]"
      },
      "exec_data": {
        "problema": "...", "hipotese": "...", "solucao": "...",
        "resultado_tangivel": "...", "resultado_intangivel": "...",
        "objetivo": "...", "investimento_total": "R$X",
        "vpl": "R$X", "roi_acumulado": "X%", "tir": "X%",
        "payback_simples": "...", "payback_descontado": "...",
        "aumento_receita": "X%", "reducao_custo": "X%", "eficiencia_operacional": "X%"
      },
      "duration": 120
    }
  ]
}

LAYOUT_IDs VÁLIDOS para Relatório Executivo: er-cover, er-dashboard, er-prototype, er-closing

REGRAS INEGOCIÁVEIS:
1. CADA slide deve ter: order, layout_id, title, bullets (array), speakerNotes, fields, duration
2. Slides er-dashboard DEVEM ter TANTO "fields" (para o template) QUANTO "exec_data" (para UI)
3. Os valores em fields e exec_data devem ser CONSISTENTES entre si
4. TODOS os campos de fields do dashboard devem ser preenchidos com dados reais do briefing
5. speakerNotes deve vir do storyteller — texto natural de 3-5 frases
6. Se o reviewer pediu correções, APLIQUE-AS
7. SEMPRE: er-cover → N×er-dashboard → er-prototype (opcional) → er-closing
8. Responda APENAS o JSON, sem markdown.
9. Este é o OUTPUT FINAL — deve estar PERFEITO e COMPLETO`;
      }

      return `${base}

Você é o ÚLTIMO agente. Sua missão é FUNDIR todos os outputs anteriores em um deck FINAL perfeito.

Copy (textos): ${truncate(previousOutputs.copywriter || 'N/A', 2000)}
Design (visual): ${truncate(previousOutputs.designer || 'N/A', 1500)}
Roteiro (speaker notes): ${truncate(previousOutputs.storyteller || 'N/A', 1500)}
Revisão (correções): ${truncate(previousOutputs['quality-reviewer'] || 'N/A', 1000)}

APLIQUE as correções do quality-reviewer. Se o reviewer identificou problemas, CORRIJA-OS no output final.

Gere um JSON com o deck COMPLETO e FINAL:
{
  "slides": [
    {
      "order": 0,
      "layout_id": "cover",
      "title": "Título final do slide",
      "subtitle": "Subtítulo final",
      "bullets": ["Bullet final 1", "Bullet final 2"],
      "speakerNotes": "Speaker notes completas e naturais do storyteller",
      "fields": {"title": "Título da capa", "subtitle": "Subtítulo"},
      "duration": 60
    }
  ]
}

LAYOUT_IDs VÁLIDOS: cover, agenda, content-3col, content-headers, content-2col, numbers, section-divider, grid-4cards, dashboard-kpi, table, comparison-5col, closing

REGRAS INEGOCIÁVEIS:
1. CADA slide deve ter: order, layout_id, title, bullets (array), speakerNotes, fields, duration
2. layout_id deve vir do catálogo de templates Avanade (content-planner definiu)
3. "fields" contém os valores para substituir no template (fieldId → texto)
4. speakerNotes deve vir do storyteller — texto natural de 3-5 frases
5. Subtitle pode ser "" mas NUNCA undefined
6. TEXTOS CURTOS: títulos ≤6 palavras, bullets ≤12 palavras (o template tem espaço fixo)
7. Se o reviewer pediu correções, APLIQUE-AS
8. O array slides deve estar na ORDEM CORRETA (order: 0, 1, 2, ...)
9. SEMPRE comece com "cover" e termine com "closing"
10. Responda APENAS o JSON, sem markdown.
11. Este é o OUTPUT FINAL — deve estar PERFEITO e COMPLETO`;
    }

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
