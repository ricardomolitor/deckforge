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
// CATÁLOGO DE SLIDES DO TEMPLATE RELATÓRIO EXECUTIVO
// Template: "Relatorio Executivo - IT Forum.pptx"
// 4 slides: Cover, Dashboard (duplicável), Protótipo, Encerramento
// =============================================

export const EXEC_REPORT_CATALOG: TemplateSlideDef[] = [
  // --- SLIDE 1: CAPA EXEC REPORT ---
  {
    slideNum: 1,
    layoutId: 'er-cover',
    name: 'Capa Relatório Executivo',
    purpose: 'Slide de abertura com título do relatório, nome do cliente e experiência/projeto',
    fields: [
      { fieldId: 'title', placeholder: 'Relatório Executivo', instruction: 'Manter "Relatório Executivo" ou variação', maxWords: 5, required: true },
      { fieldId: 'client', placeholder: 'Frontier Firms', instruction: 'Nome do cliente ou programa', maxWords: 5, required: true },
      { fieldId: 'experience', placeholder: 'U Experience', instruction: 'Nome da experiência, evento ou projeto', maxWords: 5, required: false },
    ],
    whenToUse: 'SEMPRE como primeiro slide do relatório executivo.',
    duplicable: false,
  },

  // --- SLIDE 2: DASHBOARD DE BUSINESS CASE ---
  {
    slideNum: 2,
    layoutId: 'er-dashboard',
    name: 'Dashboard de Business Case',
    purpose: 'Slide completo com KPIs financeiros, métricas de impacto, hipótese e resultados do case',
    fields: [
      // Único no slide — replacement simples
      { fieldId: 'scenario', placeholder: 'CENÁRIO CONSERVADOR', instruction: 'Nome do cenário (Conservador, Otimista, Base)', maxWords: 3, required: true },
      { fieldId: 'case_name', placeholder: '[NOME DO CASE]', instruction: 'Nome do business case / projeto', maxWords: 8, required: true },
      { fieldId: 'resultado_tangivel', placeholder: '[Resultado chave tangivel esperado]', instruction: 'Resultado tangível principal esperado', maxWords: 12, required: true },
      { fieldId: 'resultado_intangivel', placeholder: '[Resultado chave intangivel esperado e benefícios]', instruction: 'Resultado intangível e benefícios esperados', maxWords: 15, required: true },
      // Percentuais (únicos no slide)
      { fieldId: 'aumento_receita', placeholder: '75%', instruction: 'Percentual de aumento de receita', maxWords: 2, required: true },
      { fieldId: 'reducao_custo', placeholder: '7%', instruction: 'Percentual de redução de custo', maxWords: 2, required: true },
      { fieldId: 'eficiencia', placeholder: '6%', instruction: 'Percentual de eficiência operacional', maxWords: 2, required: true },
      // Valores monetários (R$x aparece 2× no slide: investimento e VPL)
      { fieldId: 'investimento', placeholder: 'R$x', instruction: 'Investimento total (CAPEX+OPEX) — ex: R$2.8M', maxWords: 3, required: true },
      { fieldId: 'vpl', placeholder: 'R$x', instruction: 'VPL a 10% a.a. — ex: R$4.2M', maxWords: 3, required: true },
      // Percentuais ROI/TIR (X% aparece 2× no slide: ROI e TIR)
      { fieldId: 'roi', placeholder: 'X%', instruction: 'ROI acumulado 5 anos — ex: 180%', maxWords: 2, required: true },
      { fieldId: 'tir', placeholder: 'X%', instruction: 'TIR em % a.a. — ex: 45%', maxWords: 2, required: true },
      // Hipótese (1ª ocorrência de [Descrição])
      { fieldId: 'hipotese', placeholder: '[Descrição]', instruction: 'Descrição da hipótese testada', maxWords: 25, required: true },
    ],
    whenToUse: 'Um slide por business case/hipótese. DUPLICAR para múltiplos cases no mesmo relatório.',
    duplicable: true,
  },

  // --- SLIDE 3: RECOMENDAÇÕES ---
  {
    slideNum: 3,
    layoutId: 'er-recommendations',
    name: 'Recomendação Final',
    purpose: 'Slide de recomendações finais com título, subtítulo (heading) e corpo de texto com as recomendações',
    fields: [
      { fieldId: 'title', placeholder: 'Recomendação Final', instruction: 'Título do slide (ex: Recomendação Final, Próximos Passos)', maxWords: 5, required: true },
      { fieldId: 'heading', placeholder: 'Header 2', instruction: 'Subtítulo ou tema principal da recomendação', maxWords: 8, required: true },
      { fieldId: 'body', placeholder: 'Minimum font size 14pt and line spacing of at least Multiple 1.1 Vestibulum id ligula porta felis euismod semper. Aenean lacinia bibendum nulla sed consectetur. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Fusce dapibus, tellus ac cursus commodo, tortor mauris.', instruction: 'Texto completo das recomendações. Use parágrafos ou bullets para organizar (3-6 recomendações principais com justificativa breve)', maxWords: 150, required: true },
    ],
    whenToUse: 'Para apresentar recomendações finais, próximos passos ou conclusões. Incluir SEMPRE no relatório.',
    duplicable: false,
  },

  // --- SLIDE 4: PROTÓTIPO ---
  {
    slideNum: 4,
    layoutId: 'er-prototype',
    name: 'Protótipo / Demo',
    purpose: 'Slide para mostrar protótipo ou demo do projeto',
    fields: [
      { fieldId: 'title', placeholder: 'Protótipo', instruction: 'Título (Protótipo, Demo, POC)', maxWords: 3, required: true },
      { fieldId: 'demo', placeholder: '[vídeo demo]', instruction: 'Descrição ou link do protótipo/demo', maxWords: 10, required: false },
    ],
    whenToUse: 'Para mostrar protótipo ou demo. Opcional.',
    duplicable: false,
  },

  // --- SLIDE 5: ENCERRAMENTO ---
  {
    slideNum: 5,
    layoutId: 'er-closing',
    name: 'Encerramento',
    purpose: 'Slide final institucional',
    fields: [],
    whenToUse: 'SEMPRE como último slide.',
    duplicable: false,
  },
];

/**
 * Gera a descrição do catálogo Relatório Executivo para o prompt dos agentes.
 */
export function getExecReportCatalogPrompt(): string {
  const dashboard = EXEC_REPORT_CATALOG.find(s => s.layoutId === 'er-dashboard')!;
  const fieldList = dashboard.fields
    .map(f => `    • ${f.fieldId}: ${f.instruction}`)
    .join('\n');

  const recEntry = EXEC_REPORT_CATALOG.find(s => s.layoutId === 'er-recommendations')!;
  const recFields = recEntry.fields
    .map(f => `    • ${f.fieldId}: ${f.instruction}`)
    .join('\n');

  return `
CATÁLOGO DO TEMPLATE "RELATÓRIO EXECUTIVO - IT FORUM" (obrigatório para Relatórios Executivos):
Este template contém 5 slides com layout profissional de business case financeiro.

LAYOUTS DISPONÍVEIS:
  - "er-cover" (slide 1): Capa — título "Relatório Executivo", nome do cliente, nome da experiência/projeto
  - "er-dashboard" (slide 2): Dashboard de Business Case — slide principal com TODAS as métricas [DUPLICÁVEL]
  - "er-recommendations" (slide 3): Recomendação Final — recomendações, próximos passos e conclusões
  - "er-prototype" (slide 4): Protótipo/Demo — slide para mostrar protótipo ou demo (opcional)
  - "er-closing" (slide 5): Encerramento institucional (não precisa ser preenchida)

CAMPOS DO DASHBOARD (er-dashboard) — cada hipótese/case preenche estes campos:
${fieldList}

CAMPOS DA RECOMENDAÇÃO (er-recommendations):
${recFields}

REGRAS:
1. SEMPRE: er-cover → N×er-dashboard → er-recommendations → er-prototype (opcional) → er-closing
2. Cada hipótese/caso do briefing gera UM er-dashboard (duplicação automática no export)
3. Preencha TODOS os campos obrigatórios do dashboard com dados do briefing
4. er-recommendations DEVE conter recomendações claras e acionáveis baseadas na análise
5. Valores monetários no formato "R$X.XM" ou "R$X,XX"
6. Percentuais com símbolo: "180%", "35%", etc.
7. O scenario é geralmente "CENÁRIO CONSERVADOR" ou "CENÁRIO BASE"
8. Cada slide na resposta deve ter: { "layout_id": "er-...", "fields": { ... } }
`;
}

/**
 * Lookup helper para catálogo Exec Report.
 */
export function getExecSlideByLayoutId(layoutId: string): TemplateSlideDef | undefined {
  return EXEC_REPORT_CATALOG.find((s) => s.layoutId === layoutId);
}

/**
 * Verifica se a categoria requer o template de Relatório Executivo.
 */
export function isExecReportCategory(category: string): boolean {
  return category === 'relatorio-executivo';
}

// =============================================
// CATÁLOGO DE SLIDES DO TEMPLATE BUSINESS CASE
// Template: "Copy-of-Impact-Report.pptx"
// 6 slides: Cover, Contexto, Solução, Benchmarks, Impacto Financeiro, Waterfall
// =============================================

export const BUSINESS_CASE_CATALOG: TemplateSlideDef[] = [
  // --- SLIDE 1: CAPA BUSINESS CASE ---
  {
    slideNum: 1,
    layoutId: 'bc-cover',
    name: 'Capa Business Case',
    purpose: 'Slide de abertura com título do projeto, proposta de valor e linha de contexto (horizonte, moeda)',
    fields: [
      { fieldId: 'title', placeholder: 'Plataforma de Onboarding com IA', instruction: 'Nome do projeto ou iniciativa (impactante, 3-8 palavras)', maxWords: 8, required: true },
      { fieldId: 'subtitle', placeholder: 'Acelerando Produtividade, Retenção e Qualidade Operacional', instruction: 'Proposta de valor em uma frase (3 benefícios-chave)', maxWords: 12, required: true },
      { fieldId: 'context_line', placeholder: 'Business Case Executivo – Horizonte 3 anos | Brasil (BRL) | Dados médios de mercado', instruction: 'Linha de contexto: tipo, horizonte, moeda, base de dados', maxWords: 20, required: true },
    ],
    whenToUse: 'SEMPRE como primeiro slide do business case. Obrigatório.',
    duplicable: false,
  },

  // --- SLIDE 2: CONTEXTO E PROBLEMA ---
  {
    slideNum: 2,
    layoutId: 'bc-context',
    name: 'Contexto e Problema de Negócio',
    purpose: 'Cenário atual, indicadores críticos e contexto macro que justificam o investimento',
    fields: [
      { fieldId: 'title', placeholder: 'Contexto e Problema de Negócio', instruction: 'Título do slide (descreve o problema)', maxWords: 6, required: true },
      { fieldId: 'summary', placeholder: 'Alto volume de admissões + onboarding manual = desperdício recorrente de valor.', instruction: 'Frase-resumo do problema (conclusão-chave em 1 linha)', maxWords: 20, required: true },
      { fieldId: 'section1_heading', placeholder: 'Escala Atual', instruction: 'Título da primeira seção de contexto', maxWords: 4, required: true },
      { fieldId: 'section1_body', placeholder: '500 novas admissões/mês → 6.000 colaboradores/ano\nOnboarding majoritariamente manual, pouco padronizado', instruction: 'Dados da escala atual do problema (2-3 bullets com números)', maxWords: 30, required: true },
      { fieldId: 'section2_heading', placeholder: 'Indicadores Críticos', instruction: 'Título da seção de indicadores/métricas do problema', maxWords: 4, required: true },
      { fieldId: 'section2_body', placeholder: '60 dias até produtividade plena (ramp-up)\n50% dos novos desligam-se em até 90 dias', instruction: 'KPIs que demonstram a gravidade do problema (2-3 métricas)', maxWords: 30, required: true },
      { fieldId: 'section3_heading', placeholder: 'Cenário Macro Brasil', instruction: 'Título da seção de contexto macro/externo', maxWords: 4, required: true },
      { fieldId: 'section3_body', placeholder: 'Inflação 6–7% a.a. → custo de mão de obra subindo\nWACC de referência 8% a.a. → capital caro', instruction: 'Fatores macro que amplificam o problema (2-3 fatores com dados)', maxWords: 30, required: true },
      { fieldId: 'callout', placeholder: 'Desperdício recorrente: recontratações, perda de capacidade, erros de novatos', instruction: 'Frase de alerta que resume o custo de NÃO agir', maxWords: 15, required: true },
    ],
    whenToUse: 'SEMPRE como segundo slide. Define o problema que o business case resolve.',
    duplicable: false,
  },

  // --- SLIDE 3: TESE DA SOLUÇÃO ---
  {
    slideNum: 3,
    layoutId: 'bc-solution',
    name: 'Tese da Solução',
    purpose: 'Solução proposta com características e 3 impactos esperados quantificados',
    fields: [
      { fieldId: 'title', placeholder: 'Tese da Solução – Onboarding com IA no Loop', instruction: 'Título com nome da solução e diferencial tecnológico', maxWords: 10, required: true },
      { fieldId: 'summary', placeholder: 'Transformar onboarding em um processo digital, inteligente e escalável.', instruction: 'Frase-resumo da transformação proposta', maxWords: 15, required: true },
      { fieldId: 'solution_heading', placeholder: 'O que é a Solução', instruction: 'Título da seção que descreve a solução', maxWords: 5, required: true },
      { fieldId: 'solution_bullets', placeholder: 'Jornadas padronizadas por cargo/área, com trilhas multimídia|IA no loop: recomendação de próximos passos e conteúdos|Resposta a dúvidas em tempo real|Sinalização de risco de engajamento baixo|Dashboards para RH e líderes (progresso, alertas, métricas)', instruction: 'Características da solução separadas por | (4-6 bullets)', maxWords: 80, required: true },
      { fieldId: 'impacts_heading', placeholder: 'Impactos Esperados', instruction: 'Título da seção de impactos', maxWords: 3, required: true },
      { fieldId: 'impact1_value', placeholder: '-12 dias', instruction: 'Valor numérico do impacto 1 (curto)', maxWords: 3, required: true },
      { fieldId: 'impact1_label', placeholder: 'Redução de Ramp-up', instruction: 'Nome do impacto 1', maxWords: 4, required: true },
      { fieldId: 'impact1_detail', placeholder: '60 → 48 dias', instruction: 'Detalhe do impacto 1 (antes → depois)', maxWords: 8, required: true },
      { fieldId: 'impact2_value', placeholder: '-10 p.p.', instruction: 'Valor numérico do impacto 2', maxWords: 3, required: true },
      { fieldId: 'impact2_label', placeholder: 'Redução de Turnover', instruction: 'Nome do impacto 2', maxWords: 4, required: true },
      { fieldId: 'impact2_detail', placeholder: '50% → 40% em 90 dias', instruction: 'Detalhe do impacto 2 (antes → depois)', maxWords: 8, required: true },
      { fieldId: 'impact3_value', placeholder: '-20%', instruction: 'Valor numérico do impacto 3', maxWords: 3, required: true },
      { fieldId: 'impact3_label', placeholder: 'Erros de Novatos', instruction: 'Nome do impacto 3', maxWords: 4, required: true },
      { fieldId: 'impact3_detail', placeholder: 'Incidentes relevantes', instruction: 'Detalhe do impacto 3', maxWords: 8, required: true },
    ],
    whenToUse: 'SEMPRE como terceiro slide. Mostra O QUE será feito e QUAL o impacto.',
    duplicable: false,
  },

  // --- SLIDE 4: BENCHMARKS ECONÔMICOS ---
  {
    slideNum: 4,
    layoutId: 'bc-benchmarks',
    name: 'Base Econômica – Benchmarks',
    purpose: 'Tabela de premissas econômicas com parâmetros, valores de mercado e comentários',
    fields: [
      { fieldId: 'title', placeholder: 'Base Econômica – Benchmarks de Mercado', instruction: 'Título do slide de premissas', maxWords: 8, required: true },
      { fieldId: 'summary', placeholder: 'Usamos médias de mercado para estimar valor econômico, claramente explicitadas.', instruction: 'Frase que explica a metodologia de estimativa', maxWords: 15, required: true },
      { fieldId: 'headers', placeholder: 'Parâmetro|Valor de Mercado|Comentário', instruction: 'Cabeçalhos da tabela separados por |', maxWords: 10, required: true },
      { fieldId: 'rows', placeholder: 'Produtividade média mensal|~R$ 8.000/mês|Valor gerado por colaborador\nCusto de substituição|~R$ 12.000–16.000|1,5–2,0× salário mensal total\nCusto médio de incidente|R$ 500–1.500|Por incidente relevante\nInvestimento Ano 1|~R$ 2M|60% CAPEX / 40% OPEX\nHorizonte de análise|3 anos|Com revisões semestrais\nTaxa de desconto (WACC)|8% a.a.|Referência de mercado Brasil\nPolítica interna de payback|12 meses|Meta de retorno rápido', instruction: 'Linhas da tabela separadas por \\n, colunas por | (6-8 parâmetros)', maxWords: 120, required: true },
      { fieldId: 'footnote', placeholder: '* Premissas baseadas em médias de mercado Brasil. Serão recalibradas com dados internos nos primeiros 6–12 meses.', instruction: 'Nota de rodapé com disclaimer', maxWords: 25, required: false },
    ],
    whenToUse: 'SEMPRE como quarto slide. Dá transparência e credibilidade às premissas financeiras.',
    duplicable: false,
  },

  // --- SLIDE 5: IMPACTO FINANCEIRO ---
  {
    slideNum: 5,
    layoutId: 'bc-impact',
    name: 'Impacto Financeiro Anual',
    purpose: 'Quantifica os 3 principais benefícios financeiros anuais com cálculos detalhados',
    fields: [
      { fieldId: 'title', placeholder: 'Impacto Financeiro Anual – Antes vs Depois', instruction: 'Título do slide de impacto financeiro', maxWords: 8, required: true },
      { fieldId: 'summary', placeholder: 'Volume de 6.000 admissões/ano faz qualquer melhoria incremental ter impacto expressivo.', instruction: 'Frase que contextualiza a escala do impacto', maxWords: 20, required: true },
      { fieldId: 'benefit1_heading', placeholder: 'Ganho de Produtividade', instruction: 'Nome do benefício financeiro 1 (maior valor)', maxWords: 5, required: true },
      { fieldId: 'benefit1_body', placeholder: 'Redução média de 12 dias (60 → 48 dias de ramp-up)\n6.000 × 12 dias × R$ 364/dia ≈ R$ 26M potencial\nFator de realização 50–60%:', instruction: 'Cálculo detalhado: premissa → volume × valor → resultado', maxWords: 35, required: true },
      { fieldId: 'benefit1_value', placeholder: 'R$ 13–15M/ano', instruction: 'Valor monetário anual do benefício 1', maxWords: 5, required: true },
      { fieldId: 'benefit2_heading', placeholder: 'Redução de Turnover Inicial', instruction: 'Nome do benefício financeiro 2', maxWords: 5, required: true },
      { fieldId: 'benefit2_body', placeholder: 'Queda de 10 p.p. (50% → 40%)\n600 desligamentos evitados × R$ 14.000 =', instruction: 'Cálculo detalhado do benefício 2', maxWords: 25, required: true },
      { fieldId: 'benefit2_value', placeholder: 'R$ 8,4M/ano', instruction: 'Valor monetário anual do benefício 2', maxWords: 5, required: true },
      { fieldId: 'benefit3_heading', placeholder: 'Redução de Erros de Novatos', instruction: 'Nome do benefício financeiro 3', maxWords: 5, required: true },
      { fieldId: 'benefit3_body', placeholder: 'Redução de 20% dos incidentes relevantes\n5.000 incidentes × 20% × R$ 1.000 ≈', instruction: 'Cálculo detalhado do benefício 3', maxWords: 25, required: true },
      { fieldId: 'benefit3_value', placeholder: 'R$ 1M/ano', instruction: 'Valor monetário anual do benefício 3', maxWords: 5, required: true },
      { fieldId: 'total_value', placeholder: 'R$ 22–25M', instruction: 'Soma total dos benefícios anuais', maxWords: 5, required: true },
      { fieldId: 'total_label', placeholder: 'TOTAL BENEFÍCIOS/ANO', instruction: 'Label do total (caps, curto)', maxWords: 4, required: true },
    ],
    whenToUse: 'SEMPRE como quinto slide. Traduz os impactos em valores monetários concretos.',
    duplicable: false,
  },

  // --- SLIDE 6: WATERFALL ---
  {
    slideNum: 6,
    layoutId: 'bc-waterfall',
    name: 'Waterfall do Business Case',
    purpose: 'Tabela waterfall com investimento vs ganhos em horizonte de 3 anos + KPIs de retorno',
    fields: [
      { fieldId: 'title', placeholder: 'Waterfall do Business Case – Investimento vs Ganhos', instruction: 'Título do slide waterfall', maxWords: 8, required: true },
      { fieldId: 'summary', placeholder: 'Investimento de ~R$ 2M gera benefícios recorrentes de >R$ 20M/ano (ano cheio).', instruction: 'Frase-resumo relação investimento/retorno', maxWords: 20, required: true },
      { fieldId: 'headers', placeholder: 'Componente|Ano 1|Ano 2|Ano 3', instruction: 'Cabeçalhos da tabela waterfall', maxWords: 8, required: true },
      { fieldId: 'rows', placeholder: 'CAPEX|–R$ 1,2M|–|–\nOPEX|–R$ 0,8M|–R$ 0,8M (+ IPCA)|–R$ 0,8M (+ IPCA)\nBenefício Produtividade|+R$ 9–10M|+R$ 13–15M|+R$ 13–15M\nBenefício Turnover|+R$ 5,9M|+R$ 8,4M|+R$ 8,4M\nBenefício Erros|+R$ 0,7M|+R$ 1M|+R$ 1M\nFluxo Líquido|+R$ 13–15,5M|+R$ 21–23M|+R$ 21–23M', instruction: 'Linhas da tabela separadas por \\n, colunas por |', maxWords: 100, required: true },
      { fieldId: 'year_note', placeholder: 'Ano 1 = 70% da capacidade; Ano 2–3 = 100%', instruction: 'Nota sobre premissas de ramp-up', maxWords: 12, required: false },
      { fieldId: 'kpi1_value', placeholder: '< 12 meses', instruction: 'Valor do payback simples', maxWords: 4, required: true },
      { fieldId: 'kpi1_label', placeholder: 'Payback Simples Potencial', instruction: 'Label do KPI de payback', maxWords: 4, required: true },
      { fieldId: 'kpi2_value', placeholder: 'NPV Positivo', instruction: 'Resultado do NPV', maxWords: 4, required: true },
      { fieldId: 'kpi2_label', placeholder: 'Em 3 anos a 8% a.a.', instruction: 'Contexto do NPV (horizonte e taxa)', maxWords: 8, required: true },
      { fieldId: 'kpi3_value', placeholder: '~10x', instruction: 'Múltiplo de ROI', maxWords: 3, required: true },
      { fieldId: 'kpi3_label', placeholder: 'Retorno sobre Investimento', instruction: 'Label do ROI', maxWords: 4, required: true },
      { fieldId: 'footnote', placeholder: '* Benefícios sujeitos à realização efetiva. Revisão semestral com dados internos.', instruction: 'Disclaimer sobre benefícios', maxWords: 15, required: false },
    ],
    whenToUse: 'SEMPRE como último slide. Consolida o business case em visão financeira de 3 anos.',
    duplicable: false,
  },
];

/**
 * Gera a descrição do catálogo Business Case para o prompt dos agentes.
 */
export function getBusinessCaseCatalogPrompt(): string {
  const lines = BUSINESS_CASE_CATALOG.map((s) => {
    const fieldList = s.fields.length > 0
      ? s.fields.filter(f => f.required).map(f => `${f.fieldId} (máx ${f.maxWords} palavras)`).join(', ')
      : '(sem campos editáveis)';
    return `  - "${s.layoutId}" (slide ${s.slideNum}): ${s.name} — ${s.purpose}. Campos: ${fieldList}. ${s.whenToUse}`;
  });

  return `
CATÁLOGO DO TEMPLATE "BUSINESS CASE EXECUTIVO" (Copy-of-Impact-Report.pptx):
Este template contém 6 slides com layout profissional de Business Case completo.
Estrutura fixa — NENHUM slide é duplicável.

LAYOUTS DISPONÍVEIS:
${lines.join('\n')}

REGRAS:
1. SEMPRE seguir a ordem: bc-cover → bc-context → bc-solution → bc-benchmarks → bc-impact → bc-waterfall
2. A estrutura é FIXA em 6 slides — nenhum slide pode ser adicionado, removido ou duplicado
3. Dados financeiros DEVEM ser consistentes entre slides (bc-benchmarks → bc-impact → bc-waterfall)
4. Use formato monetário brasileiro: R$ X.XXX ou R$ X,XM
5. Percentuais com símbolo: XX% ou X,X%
6. Tabelas (bc-benchmarks e bc-waterfall): separar colunas com | e linhas com \\n
7. Impactos no bc-solution devem corresponder aos benefícios no bc-impact
8. O total no bc-impact deve ser a soma dos 3 benefícios
9. O fluxo líquido no bc-waterfall deve ser consistente com bc-impact
10. Cada slide na resposta deve ter: { "layout_id": "bc-...", "fields": { ... } }
`;
}

/**
 * Lookup helper para catálogo Business Case.
 */
export function getBusinessCaseSlideByLayoutId(layoutId: string): TemplateSlideDef | undefined {
  return BUSINESS_CASE_CATALOG.find((s) => s.layoutId === layoutId);
}

/**
 * Verifica se a categoria requer o template de Business Case.
 */
export function isBusinessCaseCategory(category: string): boolean {
  return category === 'business-case';
}

// =============================================
// CATÁLOGO DE LAYOUTS PARA APRESENTAÇÃO LIVRE
// Geração dinâmica via pptxgenjs — sem template fixo
// =============================================

/**
 * Gera a descrição do catálogo de layouts dinâmicos para o prompt dos agentes.
 * Usado na categoria "apresentacao-livre" — os agentes têm total liberdade.
 */
export function getFreeFormCatalogPrompt(): string {
  return `
CATÁLOGO DE LAYOUTS DINÂMICOS — APRESENTAÇÃO LIVRE (sem template fixo):
Nesta categoria você tem LIBERDADE TOTAL para criar a apresentação ideal.
O sistema gera cada slide do zero usando layouts inteligentes, gráficos e tabelas reais.

LAYOUTS DISPONÍVEIS (use no campo "layoutHint"):
  - "title-slide": Slide de capa com título grande, subtítulo e linha de contexto
  - "section-header": Divisória de seção (título + frase de transição)
  - "content": Slide com título + bullets organizados (3-6 bullets)
  - "two-column": Duas colunas lado a lado (comparação, prós/contras, antes/depois)
  - "chart": Slide de gráfico (barra, linha, pizza, donut, área, radar, stacked-bar)
  - "table": Slide com tabela formatada (headers + rows)
  - "chart-and-text": Gráfico à esquerda + texto explicativo à direita
  - "comparison": Slide de comparação entre 2-3 opções (título + métricas por opção)
  - "timeline": Linha do tempo com 3-6 marcos (datas + descrições)
  - "quote": Citação em destaque (frase + autor)
  - "kpi-dashboard": 3-6 KPIs em destaque (valor grande + label + variação)
  - "closing": Slide final com CTA, contato ou agradecimento
  - "image-full": Slide de imagem em tela cheia (quando referência visual é fornecida)

TIPOS DE GRÁFICOS (quando layoutHint="chart" ou "chart-and-text"):
  - "bar": Barras verticais (comparação entre categorias)
  - "stacked-bar": Barras empilhadas (composição por categoria)
  - "line": Linhas (tendências ao longo do tempo)
  - "area": Área preenchida (volume ao longo do tempo)
  - "pie": Pizza (proporção de um total)
  - "donut": Rosca (proporção com espaço central para label)
  - "radar": Radar/Spider (comparação multi-dimensional)

REGRAS DE OURO:
1. VARIEDADE: Nunca repita o mesmo layoutHint 3× seguidas. Alterne entre content, chart, table, two-column
2. DADOS VISUAIS: Se o briefing tem números, USE gráficos e tabelas — não bullets com números
3. HIERARQUIA: Cada slide tem 1 mensagem principal. Menos texto = mais impacto
4. NARRATIVA: Comece com title-slide, termine com closing. Use section-header para dividir blocos
5. CHARTS: Forneça chartData COMPLETO com categories, series com nome e values numéricos
6. TABLES: Forneça tableData com headers e rows como arrays de strings
7. CORES: Use accentColor (hex) para personalizar slides-chave. Paleta Avanade: #FF5800 (laranja), #CE0569 (magenta), #00B0F0 (azul), #28A745 (verde)
8. KPI DASHBOARD: Use para resumir métricas-chave (ROI, savings, growth) com números grandes
9. QUANTIDADE: Para uma apresentação de 15min, use 8-12 slides. Para 30min, 15-20. Para 60min, 25-35
10. CADA slide DEVE ter: title, bullets (pode ser []), speakerNotes, layoutHint, e campos opcionais (chartData, tableData, fields)
`;
}

/**
 * Verifica se a categoria é Apresentação Livre (geração dinâmica).
 */
export function isFreeFormCategory(category: string): boolean {
  return category === 'apresentacao-livre';
}
