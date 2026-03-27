// ============================================
// DeckForge — Sistema de Agentes IA Especializados v2
// Pipeline: content-planner → researcher → copywriter → designer → storyteller → quality-reviewer → finalizer
// ============================================

import { v4 as uuidv4 } from 'uuid';
import { getExecReportCatalogPrompt, getBusinessCaseCatalogPrompt } from './template-catalog';

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
  layoutType: 'title' | 'content' | 'two-column' | 'quote' | 'data' | 'closing' | 'section-break' | 'exec-report' | 'business-case';
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
    : getBusinessCaseCatalogPrompt();

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
        "client": "[Nome curto — máx 20 chars]",
        "experience": "[Evento curto — máx 20 chars]"
      }
    },
    {
      "order": 1,
      "layout_id": "er-dashboard",
      "purpose": "Business case da hipótese X",
      "key_message": "Problema → Solução → ROI",
      "fields": {
        "scenario": "CENÁRIO CONSERVADOR",
        "case_name": "[Nome curto do case — máx 4 palavras / 30 chars]",
        "resultado_tangivel": "[Resultado tangível — máx 120 chars, 5 linhas]",
        "resultado_intangivel": "[Resultado intangível — máx 120 chars, 5 linhas]",
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
      "order": N-2,
      "layout_id": "er-recommendations",
      "purpose": "Recomendações finais e próximos passos",
      "key_message": "Recomendações acionáveis baseadas na análise",
      "fields": {"title": "Recomendação Final", "heading": "Próximos Passos", "body": "1. Primeira recomendação...\n2. Segunda recomendação...\n3. Terceira recomendação..."}
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
  "narrative_arc": "capa → business cases por hipótese → recomendações → protótipo → fechamento",
  "tone_guide": "executivo, data-driven, orientado a resultados"
}

REGRAS:
- Slide 0 = "er-cover", depois 1 slide "er-dashboard" POR hipótese/caso extraído do briefing
- Se o briefing tem 3 problemas, gere 3 slides er-dashboard (ordem 1, 2, 3)
- SEMPRE incluir slide "er-recommendations" com recomendações finais após os dashboards
- Pode adicionar slide "er-prototype" e "er-closing" no final
- PREENCHA fields com valores reais extraídos do briefing ou estimativas verossímeis
- exec_data e fields DEVEM ter os mesmos valores (um é para UI, outro para o template)
- LIMITES DE TEXTO (baseado nas dimensões reais do template PowerPoint):
  * client (capa): máx 20 caracteres (box 30cm, fonte 73pt→44pt, 1 linha)
  * experience (capa): máx 20 caracteres (mesmo box da capa)
  * case_name: máx 4 palavras / 30 caracteres (box 12.3cm, fonte 36pt, 2 linhas de 17 chars)
  * resultado_tangivel: máx 120 caracteres (box 8.1cm, fonte 14pt, 5 linhas de ~29 chars)
  * resultado_intangivel: máx 120 caracteres (mesmo box de resultado)
  * hipotese (campo fields): máx 60 caracteres (texto livre)
  * descricao_hipotese: máx 29 caracteres (box 8.1cm, 1 linha a 14pt)
  * descricao_problema: máx 16 caracteres (box 4.4cm, 1 linha a 14pt)
  * problema (exec_data): máx 60 caracteres (box 4.4cm, ~4 linhas de 16 chars)
  * solucao (exec_data): máx 75 caracteres (box 9cm, 3 linhas de 25 chars)
  * investimento/vpl: formato compacto R$X.XM (máx 10 chars, box 5.6cm a 32pt)
  * roi/tir: formato compacto XX% (máx 6 chars, box 5.6cm a 32pt)
  * payback: "Atingido em X anos" ou "Não atingido" (máx 30 chars, box 5.6cm a 16pt)
  * aumento_receita/reducao_custo/eficiencia: máx 4 chars (XX%)
- Responda APENAS o JSON, sem markdown.`;
      }

      // Specialized for Business Case
      if (project.category === 'business-case') {
        return `${base}

Sua missão: Analisar o briefing e criar o PLANO DE CONTEÚDO do BUSINESS CASE EXECUTIVO.

O sistema usa OBRIGATORIAMENTE o template "Copy-of-Impact-Report.pptx".
A estrutura é FIXA em 6 slides — nenhum pode ser adicionado, removido ou duplicado.

Gere um JSON com:
{
  "presentation_concept": "conceito em uma frase do business case",
  "target_outcome": "o que o board deve DECIDIR/APROVAR após ver isto",
  "slide_plan": [
    {
      "order": 0,
      "layout_id": "bc-cover",
      "purpose": "Capa com nome do projeto e proposta de valor",
      "key_message": "Título impactante do projeto",
      "fields": {
        "title": "[Nome do projeto — máx 8 palavras]",
        "subtitle": "[Proposta de valor em 1 frase — máx 12 palavras]",
        "context_line": "Business Case Executivo – Horizonte 3 anos | Brasil (BRL) | Dados médios de mercado"
      }
    },
    {
      "order": 1,
      "layout_id": "bc-context",
      "purpose": "Contexto e problema de negócio que justifica o investimento",
      "key_message": "Problema + indicadores críticos + contexto macro",
      "fields": {
        "title": "Contexto e Problema de Negócio",
        "summary": "[Resumo do problema em 1 linha]",
        "section1_heading": "[Escala/Volume]",
        "section1_body": "[Dados de escala — 2-3 bullets com números]",
        "section2_heading": "[Indicadores Críticos]",
        "section2_body": "[KPIs que demonstram a gravidade — 2-3 métricas]",
        "section3_heading": "[Cenário Macro]",
        "section3_body": "[Fatores externos que amplificam o problema]",
        "callout": "[Custo de NÃO agir — frase de alerta]"
      }
    },
    {
      "order": 2,
      "layout_id": "bc-solution",
      "purpose": "Tese da solução com características e 3 impactos quantificados",
      "key_message": "O QUE será feito e QUAL o impacto",
      "fields": {
        "title": "[Nome da solução + diferencial — máx 10 palavras]",
        "summary": "[Transformação proposta em 1 frase]",
        "solution_heading": "O que é a Solução",
        "solution_bullets": "[bullet1|bullet2|bullet3|bullet4]",
        "impacts_heading": "Impactos Esperados",
        "impact1_value": "[valor numérico, ex: -12 dias]",
        "impact1_label": "[Nome do impacto 1]",
        "impact1_detail": "[antes → depois]",
        "impact2_value": "[valor numérico]",
        "impact2_label": "[Nome do impacto 2]",
        "impact2_detail": "[antes → depois]",
        "impact3_value": "[valor numérico]",
        "impact3_label": "[Nome do impacto 3]",
        "impact3_detail": "[detalhe do impacto]"
      }
    },
    {
      "order": 3,
      "layout_id": "bc-benchmarks",
      "purpose": "Tabela de premissas econômicas com transparência total",
      "key_message": "Credibilidade das premissas financeiras",
      "fields": {
        "title": "Base Econômica – Benchmarks de Mercado",
        "summary": "[Metodologia de estimativa em 1 frase]",
        "headers": "Parâmetro|Valor de Mercado|Comentário",
        "rows": "[param1|valor1|comentário1\\nparam2|valor2|comentário2\\n...]",
        "footnote": "[Disclaimer sobre premissas]"
      }
    },
    {
      "order": 4,
      "layout_id": "bc-impact",
      "purpose": "Quantificação dos 3 benefícios financeiros anuais com cálculos",
      "key_message": "Tradução de impactos em R$ concretos",
      "fields": {
        "title": "Impacto Financeiro Anual – Antes vs Depois",
        "summary": "[Escala do impacto em 1 frase]",
        "benefit1_heading": "[Benefício 1]",
        "benefit1_body": "[Cálculo: premissa → volume × valor → resultado]",
        "benefit1_value": "[R$ XM/ano]",
        "benefit2_heading": "[Benefício 2]",
        "benefit2_body": "[Cálculo detalhado]",
        "benefit2_value": "[R$ XM/ano]",
        "benefit3_heading": "[Benefício 3]",
        "benefit3_body": "[Cálculo detalhado]",
        "benefit3_value": "[R$ XM/ano]",
        "total_value": "[R$ XM total]",
        "total_label": "TOTAL BENEFÍCIOS/ANO"
      }
    },
    {
      "order": 5,
      "layout_id": "bc-waterfall",
      "purpose": "Waterfall financeiro de 3 anos com KPIs de retorno",
      "key_message": "Consolidação: investimento vs ganhos + payback + NPV + ROI",
      "fields": {
        "title": "Waterfall do Business Case – Investimento vs Ganhos",
        "summary": "[Relação investimento/retorno em 1 frase]",
        "headers": "Componente|Ano 1|Ano 2|Ano 3",
        "rows": "[CAPEX|...|...|...\\nOPEX|...|...|...\\nBenefícios...|...|...|...\\nFluxo Líquido|...|...|...]",
        "year_note": "[Premissas de ramp-up por ano]",
        "kpi1_value": "[payback]",
        "kpi1_label": "Payback Simples",
        "kpi2_value": "[NPV]",
        "kpi2_label": "[horizonte e taxa]",
        "kpi3_value": "[ROI múltiplo]",
        "kpi3_label": "Retorno sobre Investimento",
        "footnote": "[Disclaimer]"
      }
    }
  ],
  "narrative_arc": "cover → contexto/problema → tese da solução → benchmarks → impacto financeiro → waterfall/ROI",
  "tone_guide": "executivo, data-driven, orientado a decisão financeira"
}

REGRAS:
- SEMPRE 6 slides, na ordem: bc-cover → bc-context → bc-solution → bc-benchmarks → bc-impact → bc-waterfall
- Dados financeiros DEVEM ser consistentes entre slides (premissas → cálculos → waterfall)
- Os 3 impactos no bc-solution devem corresponder aos 3 benefícios no bc-impact
- O total no bc-impact = soma dos 3 benefícios
- O waterfall deve usar os mesmos valores do bc-impact
- Formato monetário brasileiro: R$ X,XM ou R$ X.XXX
- Tabelas: separar colunas com | e linhas com \\n
- Responda APENAS o JSON, sem markdown.`;
      }

      // Default: treat as business-case
      return `${base}

Sua missão: Analisar o briefing e criar um PLANO DE CONTEÚDO para um Business Case Executivo.
Use o catálogo de template Business Case com 6 slides FIXOS.

Gere um JSON no mesmo formato descrito acima para business-case.
Responda APENAS o JSON, sem markdown.`;
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

      // Specialized for Business Case
      if (project.category === 'business-case') {
        return `${base}

Plano: ${truncate(previousOutputs['content-planner'] || 'N/A', 2000)}
Dados: ${truncate(previousOutputs.researcher || 'N/A', 1500)}

Sua missão: Escrever o COPY de cada slide do BUSINESS CASE EXECUTIVO usando o template "Copy-of-Impact-Report.pptx".

O plano já contém fields com dados de business case. Você deve PRESERVAR todos os dados financeiros e REFINAR o copy para máximo impacto.

Gere um JSON com:
{
  "slides": [
    {
      "order": 0,
      "layout_id": "bc-cover",
      "title": "[Nome do Projeto]",
      "subtitle": "[Proposta de valor]",
      "bullets": [],
      "fields": {
        "title": "[Nome do projeto — impactante, 3-8 palavras]",
        "subtitle": "[Proposta de valor com 3 benefícios-chave]",
        "context_line": "[Tipo, horizonte, moeda, base de dados]"
      }
    },
    {
      "order": 1,
      "layout_id": "bc-context",
      "title": "Contexto e Problema de Negócio",
      "subtitle": "",
      "bullets": [],
      "fields": {
        "title": "[Título do problema]",
        "summary": "[Frase-resumo do problema — impactante]",
        "section1_heading": "[Escala]",
        "section1_body": "[Dados de escala com números concretos]",
        "section2_heading": "[Indicadores]",
        "section2_body": "[KPIs que demonstram gravidade]",
        "section3_heading": "[Macro]",
        "section3_body": "[Fatores externos]",
        "callout": "[Custo de NÃO agir — frase de alerta memorável]"
      }
    },
    {
      "order": 2,
      "layout_id": "bc-solution",
      "title": "[Nome da Solução]",
      "subtitle": "",
      "bullets": [],
      "fields": {
        "title": "[Solução + diferencial — máx 10 palavras]",
        "summary": "[Transformação proposta]",
        "solution_heading": "O que é a Solução",
        "solution_bullets": "[bullet1|bullet2|bullet3|bullet4]",
        "impacts_heading": "Impactos Esperados",
        "impact1_value": "[valor]", "impact1_label": "[label]", "impact1_detail": "[antes → depois]",
        "impact2_value": "[valor]", "impact2_label": "[label]", "impact2_detail": "[antes → depois]",
        "impact3_value": "[valor]", "impact3_label": "[label]", "impact3_detail": "[detalhe]"
      }
    },
    {
      "order": 3,
      "layout_id": "bc-benchmarks",
      "title": "Base Econômica – Benchmarks",
      "subtitle": "",
      "bullets": [],
      "fields": {
        "title": "[Título das premissas]",
        "summary": "[Metodologia de estimativa]",
        "headers": "Parâmetro|Valor de Mercado|Comentário",
        "rows": "[6-8 linhas de premissas com param|valor|comentário]",
        "footnote": "[Disclaimer]"
      }
    },
    {
      "order": 4,
      "layout_id": "bc-impact",
      "title": "Impacto Financeiro Anual",
      "subtitle": "",
      "bullets": [],
      "fields": {
        "title": "[Impacto Financeiro Anual]",
        "summary": "[Escala do impacto]",
        "benefit1_heading": "[Benefício 1]", "benefit1_body": "[Cálculo detalhado]", "benefit1_value": "[R$ XM/ano]",
        "benefit2_heading": "[Benefício 2]", "benefit2_body": "[Cálculo detalhado]", "benefit2_value": "[R$ XM/ano]",
        "benefit3_heading": "[Benefício 3]", "benefit3_body": "[Cálculo detalhado]", "benefit3_value": "[R$ XM/ano]",
        "total_value": "[R$ XM total]",
        "total_label": "TOTAL BENEFÍCIOS/ANO"
      }
    },
    {
      "order": 5,
      "layout_id": "bc-waterfall",
      "title": "Waterfall do Business Case",
      "subtitle": "",
      "bullets": [],
      "fields": {
        "title": "[Waterfall – Investimento vs Ganhos]",
        "summary": "[Relação investimento/retorno]",
        "headers": "Componente|Ano 1|Ano 2|Ano 3",
        "rows": "[CAPEX, OPEX, Benefícios, Fluxo Líquido — cada linha com valores por ano]",
        "year_note": "[Premissas de ramp-up]",
        "kpi1_value": "[payback]", "kpi1_label": "Payback Simples",
        "kpi2_value": "[NPV]", "kpi2_label": "[horizonte e taxa]",
        "kpi3_value": "[ROI]", "kpi3_label": "Retorno sobre Investimento",
        "footnote": "[Disclaimer]"
      }
    }
  ]
}

REGRAS:
- Mantenha os dados financeiros do plano. Refine copy, não invente números.
- Dados DEVEM ser consistentes entre slides (bc-benchmarks → bc-impact → bc-waterfall)
- Total no bc-impact = soma dos 3 benefícios
- Valores do waterfall devem usar os mesmos dados do bc-impact
- Copy deve ser impactante: callouts memoráveis, summaries diretos, títulos que vendem
- Tabelas: separar colunas com | e linhas com \\n
- Responda APENAS o JSON, sem markdown.`;
      }

      // Default: treat as business-case
      return `${base}

Plano de Conteúdo: ${truncate(previousOutputs['content-planner'] || 'N/A', 2000)}
Dados e Insights: ${truncate(previousOutputs.researcher || 'N/A', 1500)}

Sua missão: Escrever o COPY de cada slide do Business Case Executivo.
Use o formato do catálogo Business Case com 6 slides FIXOS e campos fields.
Responda APENAS o JSON, sem markdown.`;
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

O template "Relatório Executivo - IT Forum" tem 5 layouts: er-cover, er-dashboard, er-recommendations, er-prototype, er-closing.

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

Exemplo de slide er-recommendations:
{
  "order": 2,
  "layout_id": "er-recommendations",
  "title": "Recomendação Final",
  "subtitle": "",
  "bullets": [],
  "speakerNotes": "Speaker notes com as recomendações principais",
  "fields": {
    "title": "Recomendação Final",
    "heading": "Próximos Passos Recomendados",
    "body": "1. Primeira recomendação com justificativa\n2. Segunda recomendação com justificativa\n3. Terceira recomendação com justificativa"
  },
  "duration": 60
}

LAYOUT_IDs VÁLIDOS para Relatório Executivo: er-cover, er-dashboard, er-recommendations, er-prototype, er-closing

REGRAS INEGOCIÁVEIS:
1. CADA slide deve ter: order, layout_id, title, bullets (array), speakerNotes, fields, duration
2. Slides er-dashboard DEVEM ter TANTO "fields" (para o template) QUANTO "exec_data" (para UI)
3. Os valores em fields e exec_data devem ser CONSISTENTES entre si
4. TODOS os campos de fields do dashboard devem ser preenchidos com dados reais do briefing
5. speakerNotes deve vir do storyteller — texto natural de 3-5 frases
6. Se o reviewer pediu correções, APLIQUE-AS
7. SEMPRE: er-cover → N×er-dashboard → er-recommendations → er-prototype (opcional) → er-closing
8. Responda APENAS o JSON, sem markdown.
9. Este é o OUTPUT FINAL — deve estar PERFEITO e COMPLETO`;
      }

      // Specialized finalizer for Business Case
      if (project.category === 'business-case') {
        return `${base}

Você é o ÚLTIMO agente. Sua missão é FUNDIR todos os outputs anteriores no BUSINESS CASE EXECUTIVO FINAL.

Copy (textos): ${truncate(previousOutputs.copywriter || 'N/A', 2000)}
Design (visual): ${truncate(previousOutputs.designer || 'N/A', 1500)}
Roteiro (speaker notes): ${truncate(previousOutputs.storyteller || 'N/A', 1500)}
Revisão (correções): ${truncate(previousOutputs['quality-reviewer'] || 'N/A', 1000)}

APLIQUE as correções do quality-reviewer. CORRIJA os problemas identificados.

O template "Copy-of-Impact-Report.pptx" tem 6 layouts FIXOS: bc-cover, bc-context, bc-solution, bc-benchmarks, bc-impact, bc-waterfall.

Gere um JSON com o deck COMPLETO e FINAL:
{
  "slides": [
    {
      "order": 0,
      "layout_id": "bc-cover",
      "title": "[Nome do Projeto]",
      "subtitle": "",
      "bullets": [],
      "speakerNotes": "Speaker notes naturais para a abertura",
      "fields": {
        "title": "[Nome do projeto]",
        "subtitle": "[Proposta de valor]",
        "context_line": "[Tipo, horizonte, moeda, base]"
      },
      "duration": 30
    },
    {
      "order": 1,
      "layout_id": "bc-context",
      "title": "Contexto e Problema",
      "subtitle": "",
      "bullets": [],
      "speakerNotes": "Speaker notes com dados e urgência",
      "fields": {
        "title": "[Título do problema]",
        "summary": "[Resumo impactante]",
        "section1_heading": "[Seção 1]", "section1_body": "[Dados de escala]",
        "section2_heading": "[Seção 2]", "section2_body": "[Indicadores críticos]",
        "section3_heading": "[Seção 3]", "section3_body": "[Contexto macro]",
        "callout": "[Custo de NÃO agir]"
      },
      "duration": 90
    },
    {
      "order": 2,
      "layout_id": "bc-solution",
      "title": "Tese da Solução",
      "subtitle": "",
      "bullets": [],
      "speakerNotes": "Speaker notes apresentando a solução",
      "fields": {
        "title": "[Solução + diferencial]",
        "summary": "[Transformação proposta]",
        "solution_heading": "O que é a Solução",
        "solution_bullets": "[bullets separados por |]",
        "impacts_heading": "Impactos Esperados",
        "impact1_value": "[valor]", "impact1_label": "[label]", "impact1_detail": "[detalhe]",
        "impact2_value": "[valor]", "impact2_label": "[label]", "impact2_detail": "[detalhe]",
        "impact3_value": "[valor]", "impact3_label": "[label]", "impact3_detail": "[detalhe]"
      },
      "duration": 120
    },
    {
      "order": 3,
      "layout_id": "bc-benchmarks",
      "title": "Base Econômica",
      "subtitle": "",
      "bullets": [],
      "speakerNotes": "Speaker notes explicando premissas",
      "fields": {
        "title": "[Título]", "summary": "[Metodologia]",
        "headers": "Parâmetro|Valor de Mercado|Comentário",
        "rows": "[Linhas da tabela]",
        "footnote": "[Disclaimer]"
      },
      "duration": 90
    },
    {
      "order": 4,
      "layout_id": "bc-impact",
      "title": "Impacto Financeiro",
      "subtitle": "",
      "bullets": [],
      "speakerNotes": "Speaker notes com cálculos e impacto",
      "fields": {
        "title": "[Título]", "summary": "[Escala]",
        "benefit1_heading": "[B1]", "benefit1_body": "[Cálculo]", "benefit1_value": "[R$]",
        "benefit2_heading": "[B2]", "benefit2_body": "[Cálculo]", "benefit2_value": "[R$]",
        "benefit3_heading": "[B3]", "benefit3_body": "[Cálculo]", "benefit3_value": "[R$]",
        "total_value": "[Total]", "total_label": "TOTAL BENEFÍCIOS/ANO"
      },
      "duration": 120
    },
    {
      "order": 5,
      "layout_id": "bc-waterfall",
      "title": "Waterfall do Business Case",
      "subtitle": "",
      "bullets": [],
      "speakerNotes": "Speaker notes com consolidação e CTA",
      "fields": {
        "title": "[Título]", "summary": "[Resumo]",
        "headers": "Componente|Ano 1|Ano 2|Ano 3",
        "rows": "[Tabela waterfall]",
        "year_note": "[Premissas]",
        "kpi1_value": "[Payback]", "kpi1_label": "Payback Simples",
        "kpi2_value": "[NPV]", "kpi2_label": "[Contexto NPV]",
        "kpi3_value": "[ROI]", "kpi3_label": "Retorno sobre Investimento",
        "footnote": "[Disclaimer]"
      },
      "duration": 120
    }
  ]
}

LAYOUT_IDs VÁLIDOS para Business Case: bc-cover, bc-context, bc-solution, bc-benchmarks, bc-impact, bc-waterfall

REGRAS INEGOCIÁVEIS:
1. CADA slide deve ter: order, layout_id, title, bullets (array), speakerNotes, fields, duration
2. SEMPRE 6 slides na ordem: bc-cover → bc-context → bc-solution → bc-benchmarks → bc-impact → bc-waterfall
3. Dados financeiros CONSISTENTES entre slides (premissas → cálculos → waterfall)
4. Total no bc-impact = soma dos 3 benefícios
5. Waterfall deve usar mesmos valores do bc-impact
6. speakerNotes deve vir do storyteller — texto natural de 3-5 frases
7. Se o reviewer pediu correções, APLIQUE-AS
8. Tabelas: separar colunas com | e linhas com \\n
9. Responda APENAS o JSON, sem markdown.
10. Este é o OUTPUT FINAL — deve estar PERFEITO e COMPLETO`;
      }

      // Default: treat as business-case
      return `${base}

Você é o ÚLTIMO agente. Sua missão é FUNDIR todos os outputs anteriores no BUSINESS CASE EXECUTIVO FINAL.
Use o formato Business Case com 6 slides FIXOS: bc-cover → bc-context → bc-solution → bc-benchmarks → bc-impact → bc-waterfall.
Responda APENAS o JSON, sem markdown.
Este é o OUTPUT FINAL — deve estar PERFEITO e COMPLETO`;
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
