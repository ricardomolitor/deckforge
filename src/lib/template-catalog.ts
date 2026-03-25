// ============================================
// DeckForge — Catálogo de Slides do Template Avanade Padrão
// Define os 21 slides disponíveis no PowerPoint_Avanade_Padrão.pptx
// e como os agentes devem selecionar e preencher cada um.
// ============================================

/**
 * Cada entrada descreve um slide do template Avanade padrão.
 * Os agentes usam este catálogo para ESCOLHER quais slides usar
 * e QUAIS textos substituir em cada slide.
 */
export interface TemplateSlideDef {
  /** Número do slide no template PPTX (1-indexed) */
  slideNum: number;
  /** ID curto para agentes referenciarem: "cover", "agenda", "content-3col", etc. */
  layoutId: string;
  /** Nome amigável em PT-BR */
  name: string;
  /** Descrição curta do propósito do slide */
  purpose: string;
  /** Campos de texto substituíveis — o agente deve preencher cada um */
  fields: TemplateFieldDef[];
  /** Quando usar este slide (instrução para o agente) */
  whenToUse: string;
  /** Pode ser duplicado? (para slides repetíveis como content) */
  duplicable: boolean;
}

export interface TemplateFieldDef {
  /** ID do campo para o agente referenciar */
  fieldId: string;
  /** Texto placeholder original no template (para matching) */
  placeholder: string;
  /** Descrição do que o agente deve colocar aqui */
  instruction: string;
  /** Máximo de palavras recomendado */
  maxWords: number;
  /** É obrigatório? */
  required: boolean;
}

// =============================================
// CATÁLOGO DE SLIDES DO TEMPLATE AVANADE
// =============================================

export const AVANADE_TEMPLATE_CATALOG: TemplateSlideDef[] = [
  // --- SLIDE 1: CAPA ---
  {
    slideNum: 1,
    layoutId: 'cover',
    name: 'Capa',
    purpose: 'Slide de abertura com título principal e subtítulo da apresentação',
    fields: [
      { fieldId: 'title', placeholder: 'Capa – Título', instruction: 'Título principal da apresentação (impactante, 3-8 palavras)', maxWords: 8, required: true },
      { fieldId: 'subtitle', placeholder: 'Capa - Subtítulo', instruction: 'Subtítulo ou contexto (ex: nome do evento, data, autor)', maxWords: 15, required: false },
    ],
    whenToUse: 'SEMPRE usar como primeiro slide. Obrigatório.',
    duplicable: false,
  },

  // --- SLIDE 3: AGENDA ---
  {
    slideNum: 3,
    layoutId: 'agenda',
    name: 'Agenda',
    purpose: 'Slide de agenda com até 10 seções numeradas',
    fields: [
      { fieldId: 'section_1_heading', placeholder: 'Section 1 heading', instruction: 'Título da seção 1', maxWords: 6, required: true },
      { fieldId: 'section_1_sub', placeholder: 'Subheading', instruction: 'Subtítulo da seção 1', maxWords: 10, required: false },
      { fieldId: 'section_2_heading', placeholder: 'Section 2 heading', instruction: 'Título da seção 2', maxWords: 6, required: true },
      { fieldId: 'section_2_sub', placeholder: 'Subheading', instruction: 'Subtítulo da seção 2', maxWords: 10, required: false },
      { fieldId: 'section_3_heading', placeholder: 'Section 3 heading', instruction: 'Título da seção 3', maxWords: 6, required: true },
      { fieldId: 'section_3_sub', placeholder: 'Subheading', instruction: 'Subtítulo da seção 3', maxWords: 10, required: false },
      { fieldId: 'section_4_heading', placeholder: 'Section 4 heading', instruction: 'Título da seção 4', maxWords: 6, required: false },
      { fieldId: 'section_4_sub', placeholder: 'Subheading', instruction: 'Subtítulo da seção 4', maxWords: 10, required: false },
      { fieldId: 'section_5_heading', placeholder: 'Section 5 heading', instruction: 'Título da seção 5', maxWords: 6, required: false },
      { fieldId: 'section_5_sub', placeholder: 'Subheading', instruction: 'Subtítulo da seção 5', maxWords: 10, required: false },
    ],
    whenToUse: 'Para apresentações com 3+ seções que precisam de um roadmap visual.',
    duplicable: false,
  },

  // --- SLIDE 4: CONTEÚDO 3 COLUNAS ---
  {
    slideNum: 4,
    layoutId: 'content-3col',
    name: 'Conteúdo com 3 Colunas e Ícones',
    purpose: 'Título + 3 colunas com ícones e texto descritivo',
    fields: [
      { fieldId: 'title', placeholder: 'Title goes here', instruction: 'Título do slide', maxWords: 6, required: true },
      { fieldId: 'body', placeholder: 'Vestibulum id ligula', instruction: 'Texto descritivo principal (1-3 parágrafos curtos)', maxWords: 50, required: true },
    ],
    whenToUse: 'Para explicar 3 conceitos/pilares em paralelo com visual limpo.',
    duplicable: true,
  },

  // --- SLIDE 5: CONTEÚDO MULTI-HEADER ---
  {
    slideNum: 5,
    layoutId: 'content-headers',
    name: 'Conteúdo com Múltiplos Headers',
    purpose: 'Slide com múltiplos blocos de texto (Header + body) empilhados',
    fields: [
      { fieldId: 'header1', placeholder: 'Header 1', instruction: 'Primeiro tópico (título curto)', maxWords: 5, required: true },
      { fieldId: 'body1', placeholder: 'Minimum font size 14pt', instruction: 'Detalhamento do primeiro tópico', maxWords: 30, required: true },
    ],
    whenToUse: 'Para detalhar múltiplos pontos com sub-headers em um único slide.',
    duplicable: true,
  },

  // --- SLIDE 6: CONTEÚDO 2 COLUNAS ---
  {
    slideNum: 6,
    layoutId: 'content-2col',
    name: 'Conteúdo com 2 Colunas',
    purpose: 'Título + 2 colunas de texto com headers internos',
    fields: [
      { fieldId: 'title', placeholder: 'Title goes here', instruction: 'Título do slide', maxWords: 6, required: true },
      { fieldId: 'header2', placeholder: 'Header 2', instruction: 'Header da coluna direita', maxWords: 5, required: true },
      { fieldId: 'body', placeholder: 'Minimum font size 14pt', instruction: 'Texto de cada coluna', maxWords: 40, required: true },
    ],
    whenToUse: 'Para comparar 2 conceitos lado a lado ou dividir conteúdo extenso.',
    duplicable: true,
  },

  // --- SLIDE 7: NÚMEROS/STATS ---
  {
    slideNum: 7,
    layoutId: 'numbers',
    name: 'Números e Estatísticas',
    purpose: 'Slide com métricas/KPIs destacados com barras de percentual',
    fields: [
      { fieldId: 'title', placeholder: 'Avanade by the numbers', instruction: 'Título (ex: "Resultados em Números")', maxWords: 6, required: true },
      { fieldId: 'metrics', placeholder: '00%', instruction: 'Valores percentuais ou numéricos destacados', maxWords: 5, required: true },
    ],
    whenToUse: 'Para destacar métricas quantitativas (ROI, crescimento, redução de custo).',
    duplicable: true,
  },

  // --- SLIDE 8: SECTION DIVIDER ---
  {
    slideNum: 8,
    layoutId: 'section-divider',
    name: 'Divisor de Seção',
    purpose: 'Slide escuro (fundo preto) com número + título de seção',
    fields: [
      { fieldId: 'number', placeholder: '01.', instruction: 'Número da seção (01., 02., etc.)', maxWords: 1, required: true },
      { fieldId: 'heading', placeholder: 'Heading goes here', instruction: 'Título da seção', maxWords: 6, required: true },
      { fieldId: 'body', placeholder: 'Vestibulum id ligula', instruction: 'Descrição breve da seção', maxWords: 30, required: false },
    ],
    whenToUse: 'Para separar blocos temáticos e dar ritmo visual. Fundo escuro com destaque.',
    duplicable: true,
  },

  // --- SLIDE 9: GRID 4 CARDS ---
  {
    slideNum: 9,
    layoutId: 'grid-4cards',
    name: 'Grid de 4 Cards',
    purpose: 'Título + 4 cards com headings e texto curto',
    fields: [
      { fieldId: 'title', placeholder: 'Title goes here', instruction: 'Título geral do slide', maxWords: 6, required: true },
      { fieldId: 'card1_heading', placeholder: 'Heading', instruction: 'Título do card 1', maxWords: 4, required: true },
      { fieldId: 'card1_body', placeholder: 'Sed posuere consectetur', instruction: 'Texto do card 1', maxWords: 15, required: true },
      { fieldId: 'card2_heading', placeholder: 'Heading', instruction: 'Título do card 2', maxWords: 4, required: true },
      { fieldId: 'card2_body', placeholder: 'Sed posuere consectetur', instruction: 'Texto do card 2', maxWords: 15, required: true },
      { fieldId: 'card3_heading', placeholder: 'Heading', instruction: 'Título do card 3', maxWords: 4, required: true },
      { fieldId: 'card3_body', placeholder: 'Sed posuere consectetur', instruction: 'Texto do card 3', maxWords: 15, required: true },
      { fieldId: 'card4_heading', placeholder: 'Heading', instruction: 'Título do card 4', maxWords: 4, required: true },
      { fieldId: 'card4_body', placeholder: 'Sed posuere consectetur', instruction: 'Texto do card 4', maxWords: 15, required: true },
    ],
    whenToUse: 'Para apresentar 4 conceitos/pilares/benefícios de forma visual equilibrada.',
    duplicable: true,
  },

  // --- SLIDE 16: DASHBOARD KPI ---
  {
    slideNum: 16,
    layoutId: 'dashboard-kpi',
    name: 'Dashboard de KPIs',
    purpose: 'Slide com múltiplos KPIs, percentuais e gráficos',
    fields: [
      { fieldId: 'title', placeholder: 'Title goes here', instruction: 'Título do dashboard', maxWords: 6, required: true },
      { fieldId: 'kpi_main', placeholder: '46732', instruction: 'KPI principal (número destaque)', maxWords: 3, required: true },
      { fieldId: 'kpi_pct1', placeholder: '25%', instruction: 'Percentual 1 (improvement)', maxWords: 2, required: false },
      { fieldId: 'kpi_pct2', placeholder: '75%', instruction: 'Percentual 2', maxWords: 2, required: false },
      { fieldId: 'kpi_pct3', placeholder: '50%', instruction: 'Percentual 3', maxWords: 2, required: false },
    ],
    whenToUse: 'Para apresentar resultados quantitativos com visual de dashboard.',
    duplicable: true,
  },

  // --- SLIDE 19: TABELA ---
  {
    slideNum: 19,
    layoutId: 'table',
    name: 'Tabela Comparativa',
    purpose: 'Slide com tabela estruturada em fundo branco',
    fields: [
      { fieldId: 'title', placeholder: 'Example of a table on white background:', instruction: 'Título da tabela', maxWords: 8, required: true },
      { fieldId: 'headers', placeholder: 'Features|Detail', instruction: 'Cabeçalhos da tabela separados por |', maxWords: 10, required: true },
      { fieldId: 'rows', placeholder: 'Row 2|Row 3|Row 4', instruction: 'Linhas da tabela (use | para separar colunas)', maxWords: 50, required: true },
    ],
    whenToUse: 'Para comparativos, roadmaps ou dados estruturados em formato tabular.',
    duplicable: true,
  },

  // --- SLIDE 20: COMPARAÇÃO MULTI-SEÇÃO ---
  {
    slideNum: 20,
    layoutId: 'comparison-5col',
    name: 'Comparação em 5 Colunas',
    purpose: 'Slide com 5 headings + texto detalhado para cada',
    fields: [
      { fieldId: 'title', placeholder: 'Title goes here', instruction: 'Título geral', maxWords: 6, required: true },
      { fieldId: 'col1_heading', placeholder: 'Heading goes here', instruction: 'Heading da coluna 1', maxWords: 4, required: true },
      { fieldId: 'col1_body', placeholder: 'Lorem ipsum dolor', instruction: 'Texto da coluna 1', maxWords: 20, required: true },
      { fieldId: 'col2_heading', placeholder: 'Heading goes here', instruction: 'Heading da coluna 2', maxWords: 4, required: true },
      { fieldId: 'col2_body', placeholder: 'Lorem ipsum dolor', instruction: 'Texto da coluna 2', maxWords: 20, required: true },
      { fieldId: 'col3_heading', placeholder: 'Heading goes here', instruction: 'Heading da coluna 3', maxWords: 4, required: true },
      { fieldId: 'col3_body', placeholder: 'Lorem ipsum dolor', instruction: 'Texto da coluna 3', maxWords: 20, required: true },
      { fieldId: 'col4_heading', placeholder: 'Heading goes here', instruction: 'Heading da coluna 4', maxWords: 4, required: true },
      { fieldId: 'col4_body', placeholder: 'Lorem ipsum dolor', instruction: 'Texto da coluna 4', maxWords: 20, required: true },
      { fieldId: 'col5_heading', placeholder: 'Heading goes here', instruction: 'Heading da coluna 5', maxWords: 4, required: true },
      { fieldId: 'col5_body', placeholder: 'Lorem ipsum dolor', instruction: 'Texto da coluna 5', maxWords: 20, required: true },
    ],
    whenToUse: 'Para comparar 5 opções, fases ou componentes lado a lado.',
    duplicable: false,
  },

  // --- SLIDE 21: ENCERRAMENTO / DO WHAT MATTERS ---
  {
    slideNum: 21,
    layoutId: 'closing',
    name: 'Encerramento',
    purpose: 'Slide final "Do what matters" (imagem de fundo Avanade)',
    fields: [],
    whenToUse: 'SEMPRE usar como último slide. Slide institucional de encerramento.',
    duplicable: false,
  },
];

/**
 * Gera a descrição do catálogo de layouts para o prompt dos agentes.
 * Inclui apenas os layouts mais úteis (não todos os 21 do template).
 */
export function getTemplateCatalogPrompt(): string {
  const lines = AVANADE_TEMPLATE_CATALOG.map((s) => {
    const fieldList = s.fields.length > 0
      ? s.fields.filter(f => f.required).map(f => `${f.fieldId} (máx ${f.maxWords} palavras)`).join(', ')
      : '(sem campos editáveis)';
    return `  - "${s.layoutId}" (slide ${s.slideNum}): ${s.name} — ${s.purpose}. Campos: ${fieldList}. ${s.whenToUse}${s.duplicable ? ' [DUPLICÁVEL]' : ''}`;
  });

  return `
CATÁLOGO DE LAYOUTS DO TEMPLATE AVANADE (PowerPoint_Avanade_Padrão.pptx):
O sistema usa OBRIGATORIAMENTE este template. Cada slide da sua apresentação deve referenciar
um layout_id deste catálogo. O export vai CLONAR o slide correspondente e substituir os textos.

LAYOUTS DISPONÍVEIS:
${lines.join('\n')}

REGRAS:
1. SEMPRE comece com layout_id="cover" e termine com layout_id="closing"
2. Slides duplicáveis podem ser usados MÚLTIPLAS VEZES (ex: "content-2col" para cada tópico)
3. Use "section-divider" para separar blocos temáticos (dá ritmo visual)
4. Textos DEVEM respeitar o maxWords — o espaço no template é fixo
5. Cada slide na resposta deve ter: { "layout_id": "...", "fields": { "fieldId": "valor", ... } }
`;
}

/**
 * Lookup helper: dado um layout_id, retorna a definição do slide.
 */
export function getSlideByLayoutId(layoutId: string): TemplateSlideDef | undefined {
  return AVANADE_TEMPLATE_CATALOG.find((s) => s.layoutId === layoutId);
}

/**
 * Lookup helper: dado um slideNum, retorna a definição.
 */
export function getSlideByNum(num: number): TemplateSlideDef | undefined {
  return AVANADE_TEMPLATE_CATALOG.find((s) => s.slideNum === num);
}
