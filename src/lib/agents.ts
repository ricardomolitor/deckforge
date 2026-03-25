// ============================================
// DeckForge — Sistema de Agentes IA Especializados v2
// Pipeline: content-planner → researcher → copywriter → designer → storyteller → quality-reviewer → finalizer
// ============================================

import { v4 as uuidv4 } from 'uuid';

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
  // Detect if a PPTX template was provided (references will contain "=== TEMPLATE PPTX BASE")
  const hasTemplate = project.references?.includes('=== TEMPLATE PPTX BASE');

  // Template gets more chars because it IS the primary input; other refs get less
  const refLimit = hasTemplate
    ? (['content-planner', 'researcher'].includes(agentId) ? 8000 : 4000)
    : (['content-planner', 'researcher'].includes(agentId) ? 4000 : 1500);

  const referencesBlock = project.references
    ? `\n\n${truncate(project.references, refLimit)}`
    : '';

  // Build per-agent template instructions (deep, structural)
  const templateInstructionMap: Record<AgentId, string> = {
    'content-planner': `

🔴 MODO TEMPLATE ATIVO — ANÁLISE ESTRUTURAL OBRIGATÓRIA:
O usuário enviou um PPTX como TEMPLATE. O export vai CLONAR esse PPTX e substituir textos.

SUAS RESPONSABILIDADES:
1. ANALISE o texto extraído do template (está nos materiais de referência abaixo). Identifique:
   - Quantos slides o template possui (conte os blocos de texto separados)
   - Qual o tipo de cada slide (capa, conteúdo, dados, executive report, encerramento)
   - Qual o fluxo narrativo do template
2. CRIE UM PLANO COM O MESMO NÚMERO DE SLIDES do template (±1-2 somente se ABSOLUTAMENTE necessário)
3. MAPEIE cada slide do plano a um slide do template usando "template_slide_ref": 1, 2, 3, etc.
   - template_slide_ref: 1 = primeiro slide do template, 2 = segundo, etc.
4. Se precisar de slides EXTRAS, coloque no final com "template_slide_ref": null
5. O SLIDE 0 (capa) deve SEMPRE mapear ao slide 1 do template — será preservado com o design original
6. Textos devem ser CURTOS: títulos máx 8 palavras, bullets máx 12 palavras — eles precisam CABER no layout do template
7. NÃO ignore o template. Se o briefing diverge, ADAPTE o template ao briefing — não descarte.`,

    researcher: `

📋 TEMPLATE ATIVO: O usuário forneceu um PPTX como template. O content-planner já mapeou a estrutura.
- Seus insights devem enriquecer os slides DENTRO da estrutura planejada
- Dados e métricas devem ser CONCISOS (números + fonte) para caber nos espaços visuais do template`,

    copywriter: `

✍️ TEMPLATE ATIVO — TEXTOS DEVEM CABER NO TEMPLATE:
O export vai injetar seus textos DIRETAMENTE no PPTX original. Isso significa:
- TÍTULOS: Máximo 6-8 palavras — o espaço visual do template é limitado
- BULLETS: Máximo 12 palavras cada — texto longo transborda e fica cortado
- SUBTÍTULOS: 1 linha, máximo 15 palavras
- NÃO escreva parágrafos — o template foi feito para texto curto e impactante
- O slide 0 (capa) terá seu título injetado no layout da capa do template — escolha um título memorável e CURTO`,

    designer: `

🎨 TEMPLATE ATIVO — DESIGN JÁ DEFINIDO PELO TEMPLATE:
O PPTX do usuário JÁ DEFINE o design visual (cores, fontes, layouts, imagens de fundo).
- NÃO proponha um novo design system — use as cores e estilo DO TEMPLATE
- SEU PAPEL agora é: decidir layout_type correto para cada slide (title, content, two-column, quote, data, section-break, closing)
- Sugira background_image apenas se temos imagens de referência que complementam o template
- visual_notes deve descrever COMO o conteúdo se organiza DENTRO do layout existente do template
- Se o template usa cor laranja Avanade (#FF6900), mantenha no design_system
- design_system.primary_color deve REFLETIR as cores do template, não inventar novas`,

    storyteller: `

🎬 TEMPLATE ATIVO: O conteúdo segue a estrutura do template PPTX.
- Speaker notes devem considerar que o visual já está definido pelo template
- Timing deve ser proporcional ao espaço de conteúdo de cada slide do template`,

    'quality-reviewer': `

🔎 TEMPLATE ATIVO — VERIFIQUE COMPATIBILIDADE:
- Os textos do copywriter CABEM nos espaços do template? (títulos curtos, bullets concisos)
- O plano respeita a estrutura do template? (mesmo número de slides, tipos corretos)
- Se textos estão longos demais, EXIJA encurtamento — texto que transborda ARRUINA a apresentação
- Verifique se template_slide_ref está consistente no plano`,

    finalizer: `

🏁 TEMPLATE ATIVO — OUTPUT DEVE SER COMPATÍVEL COM O TEMPLATE:
O export vai clonar o PPTX original e substituir textos. Seu output DEVE:
- Ter O MESMO NÚMERO de slides que o template (ou o plano mapeou)
- Manter textos CURTOS: títulos ≤8 palavras, bullets ≤12 palavras
- Cada slide deve ter title, subtitle (pode ser ""), bullets, speakerNotes, layoutType, visualSuggestion, duration
- O slide 0 mapeia à CAPA do template — será preservado com design original
- Para slides exec-report: preservar execData COMPLETO com todas as métricas`,
  };

  const templateInstruction = hasTemplate
    ? (templateInstructionMap[agentId] || '')
    : '';

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

Este é um relatório de business case estruturado. Cada caso/hipótese do briefing gera UM slide no formato "exec-report" com métricas financeiras completas.

Gere um JSON com:
{
  "presentation_concept": "conceito em uma frase do relatório",
  "target_outcome": "o que o board deve DECIDIR/APROVAR após ver isto",
  "slide_plan": [
    {"order": 0, "type": "title", "purpose": "Capa do Relatório Executivo", "key_message": "Título impactante", "content_depth": "brief", "needs_data": false, "template_slide_ref": null},
    {"order": 1, "type": "exec-report", "purpose": "Business case da hipótese X", "key_message": "Problema → Solução → ROI",
     "content_depth": "deep", "needs_data": true, "template_slide_ref": null,
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
  "narrative_arc": "título → business cases por hipótese → protótipo → fechamento",
  "tone_guide": "executivo, data-driven, orientado a resultados"
}

REGRAS:
- Slide 0 = título (type "title"), depois 1 slide "exec-report" POR hipótese/caso extraído do briefing
- Se o briefing tem 3 problemas, gere 3 slides exec-report (ordem 1, 2, 3)
- Pode adicionar slide de protótipo (type "content") e fechamento (type "closing") no final
- PREENCHA exec_data com valores reais extraídos do briefing ou estimativas verossímeis
- Responda APENAS o JSON, sem markdown.`;
      }

      return `${base}

Sua missão: Analisar o briefing e criar um PLANO DE CONTEÚDO detalhado. Você decide:
- Quantos slides a apresentação precisa (não há limite rígido — use o bom senso)
- O que vai em CADA slide
- Quando um tópico complexo merece 2-3 slides ao invés de 1
- Onde inserir pausas narrativas (section-breaks)
- Qual a profundidade de conteúdo de cada slide
${hasTemplate ? `
⚠️ TEMPLATE DETECTADO: Analise o texto do template nos materiais de referência.
- CONTE os slides do template e crie um plano com o MESMO NÚMERO de slides
- MAPEIE cada slide do plano a um slide do template (template_slide_ref: 1, 2, 3...)
- O slide 0 (order: 0) = capa do template (template_slide_ref: 1)
- Textos CURTOS: títulos ≤8 palavras, bullets ≤12 palavras (devem caber no layout do template)
- Se o briefing exige mais slides, adicione no final com template_slide_ref: null
` : ''}
Gere um JSON com:
{
  "presentation_concept": "conceito da apresentação em uma frase poderosa",
  "target_outcome": "o que a audiência deve FAZER/SENTIR/DECIDIR após ver esta apresentação",
  "slide_plan": [
    {"order": 0, "type": "title", "purpose": "Abertura impactante — gancho emocional ou dado chocante", "key_message": "A grande promessa", "content_depth": "brief", "needs_data": false, "template_slide_ref": null},
    {"order": 1, "type": "section-break", "purpose": "Transição para o contexto do problema", "key_message": "Por que isso importa AGORA", "content_depth": "brief", "needs_data": false, "template_slide_ref": null},
    {"order": 2, "type": "content", "purpose": "O problema em profundidade", "key_message": "Dor específica da audiência", "content_depth": "deep", "needs_data": true, "template_slide_ref": null}
  ],
  "narrative_arc": "descrição do arco: gancho → problema → evidência → solução → prova → visão → CTA",
  "tone_guide": "guia detalhado de tom, linguagem e nível de formalidade para todos os agentes"
}

TIPOS DE SLIDE DISPONÍVEIS: title, content, two-column, quote, data, closing, section-break
NÍVEIS DE PROFUNDIDADE: brief (título + 1-2 bullets), moderate (título + 3-4 bullets), deep (título + subtítulo + 4-5 bullets + callout)

REGRAS:
- Pense como um HUMANO planejando — não gere slides genéricos
- Se o briefing menciona "3 pilares", cada pilar pode virar 1-3 slides dependendo da complexidade
- SEMPRE comece com gancho emocional ou dado impactante (não com "Agenda" ou "Sumário")
- SEMPRE termine com call-to-action claro e específico
- Use section-breaks entre blocos temáticos para dar ritmo
- Duração total deve ser coerente com ${project.duration} minutos (~1 slide/minuto como guia, não regra)
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

Sua missão: Escrever o COPY de cada slide do RELATÓRIO EXECUTIVO.

O plano já contém exec_data com métricas de business case. Você deve PRESERVAR todos os dados e refinar o copy.

Gere um JSON com:
{
  "slides": [
    {
      "order": 0,
      "title": "Relatório Executivo | [Projeto] | [Tema]",
      "subtitle": "Subtítulo",
      "bullets": [],
      "callout": null,
      "cta": null
    },
    {
      "order": 1,
      "title": "[Nome do Problema — máx 8 palavras]",
      "subtitle": "Hipótese: [hipótese refinada]",
      "bullets": ["Resultado tangível chave", "Benefícios intangíveis"],
      "callout": "Frase de impacto com dado principal",
      "cta": null,
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
- Mantenha os exec_data do plano. Refine textos, não invente dados.
- Slide 0 = título. Slides exec-report = mantenha exec_data completo
- Títulos curtos e impactantes (máx 8 palavras)
- Bullets = resultado tangível + intangível (máx 2)
- Responda APENAS o JSON, sem markdown.`;
      }

      return `${base}

Plano de Conteúdo: ${truncate(previousOutputs['content-planner'] || 'N/A', 2000)}
Dados e Insights: ${truncate(previousOutputs.researcher || 'N/A', 1500)}

Sua missão: Escrever TODO o texto de cada slide — títulos, subtítulos, bullets, callouts e CTAs.

Imagine que você está escrevendo para UMA PESSOA ESPECÍFICA na audiência (${project.audience}). Fale diretamente com ela.
${hasTemplate ? `
⚠️ TEMPLATE ATIVO: Seus textos serão INJETADOS no PPTX original.
- Títulos: MÁXIMO 6-8 palavras (espaço visual limitado pelo template)
- Bullets: MÁXIMO 12 palavras cada (texto longo será cortado)
- Subtítulos: 1 linha, máximo 15 palavras
- NÃO escreva parágrafos — o template usa texto curto e impactante
- Escreva conteúdo NOVO e SUPERIOR baseado no briefing e nos dados, mas que CAIBA no template.
` : ''}
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
${hasTemplate ? `
⚠️ TEMPLATE ATIVO — O design visual JÁ está definido pelo PPTX do usuário.
- NÃO invente um novo design system — EXTRAIA as cores e estilo do template
- Seu papel: definir layout_type correto, sugerir composição visual DENTRO do layout existente
- Se o template usa cores Avanade (laranja #FF6900, cinza escuro #2B2B2B), use essas no design_system
- visual_notes deve descrever como o conteúdo se organiza no espaço do template
- Foque em RITMO DE LAYOUTS: alterne tipos para não ter 3 slides iguais seguidos
` : ''}

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
${hasTemplate ? '\n⚠️ TEMPLATE ATIVO: O visual está definido pelo template. Speaker notes devem considerar o espaço visual disponível e o ritmo do template original.\n' : ''}

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
      const isExecReport = project.category === 'relatorio-executivo';

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
      "title": "Título final do slide",
      "subtitle": "Subtítulo final",
      "bullets": ["Bullet final 1", "Bullet final 2"],
      "speakerNotes": "Speaker notes completas e naturais do storyteller",
      "layoutType": "title",
      "visualSuggestion": "Descrição visual do designer para este slide",
      "duration": 60${isExecReport ? ',\n      "execData": null' : ''}
    }
  ]
}

TIPOS DE layoutType PERMITIDOS: title, content, two-column, quote, data, closing, section-break${isExecReport ? ', exec-report' : ''}

REGRAS INEGOCIÁVEIS:
1. CADA slide deve ter TODOS os campos: order, title, bullets (array), speakerNotes, layoutType, visualSuggestion, duration
2. Subtitle pode ser string vazia "" mas NUNCA undefined
3. speakerNotes deve vir do storyteller — texto natural de 3-5 frases
4. layoutType deve vir do designer — use EXATAMENTE os tipos permitidos acima
5. visualSuggestion deve vir do designer — descrição da composição visual
6. duration em segundos — deve vir do storyteller
7. Se o reviewer pediu correções, APLIQUE-AS (títulos melhores, reordenação, etc.)
8. O array slides deve estar na ORDEM CORRETA (order: 0, 1, 2, ...)
${isExecReport ? '9. Para slides exec-report: PRESERVE o campo execData completo do copywriter com todas as métricas' : '9. NÃO inclua campos extras além dos especificados'}
10. Responda APENAS o JSON, sem markdown.
11. Este é o OUTPUT FINAL — deve estar PERFEITO e COMPLETO, pronto para renderizar sem nenhuma correção humana`;
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
