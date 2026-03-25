// ============================================
// DeckForge — Template Export Engine v2
// Uses the built-in Avanade template catalog to clone slides
// and replace text intelligently, like a human would.
// ============================================

import { NextRequest, NextResponse } from 'next/server';

// Next.js App Router: increase limits for large PPTX templates (up to 150MB)
export const maxDuration = 120; // seconds
export const dynamic = 'force-dynamic';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { AVANADE_TEMPLATE_CATALOG, getSlideByLayoutId, EXEC_REPORT_CATALOG, getExecSlideByLayoutId } from '@/lib/template-catalog';

// --- Types ---

interface SlideFieldValues {
  [fieldId: string]: string;
}

interface AgentSlide {
  order: number;
  layout_id: string;
  title?: string;
  subtitle?: string;
  bullets?: string[];
  speakerNotes?: string;
  fields?: SlideFieldValues;
  layoutType?: string;
  execData?: Record<string, string>;
}

interface TemplateExportRequest {
  slides: AgentSlide[];
  title: string;
  subtitle?: string;
  templateBase64?: string;
  category?: string;
}

// --- XML Utilities ---

function extractTextRuns(xml: string): { text: string; index: number }[] {
  const runs: { text: string; index: number }[] = [];
  const re = /<a:t[^>]*>([^<]*)<\/a:t>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const text = m[1].trim();
    if (text.length > 0) runs.push({ text, index: m.index });
  }
  return runs;
}

function replaceTextInXml(xml: string, oldText: string, newText: string): string {
  const safeNew = newText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const escapedOld = oldText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const pattern = new RegExp(`(<a:t[^>]*>)${escapedOld}(</a:t>)`, 'g');
  let result = xml.replace(pattern, `$1${safeNew}$2`);

  // Fallback without XML escaping
  if (result === xml && !oldText.includes('&')) {
    const plain = new RegExp(
      `(<a:t[^>]*>)${oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(</a:t>)`, 'g'
    );
    result = xml.replace(plain, `$1${safeNew}$2`);
  }
  return result;
}

function replaceNthTextInXml(xml: string, oldText: string, newText: string, n: number): string {
  const safeNew = newText
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const escaped = oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match with optional trailing/leading whitespace to handle "X% " style
  const pattern = new RegExp(`(<a:t[^>]*>)\\s*${escaped}\\s*(</a:t>)`, 'g');
  let count = 0;
  return xml.replace(pattern, (match, p1, p2) => {
    count++;
    return count === n ? `${p1}${safeNew}${p2}` : match;
  });
}

/**
 * Replace the Nth occurrence of oldText in <a:t> runs with empty string
 * (used to blank out multi-run placeholders like "Não atingido / atingido em 5 anos")
 */
function blankNthTextInXml(xml: string, oldText: string, n: number): string {
  const escaped = oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(<a:t[^>]*>)\\s*${escaped}\\s*(</a:t>)`, 'g');
  let count = 0;
  return xml.replace(pattern, (match, p1, p2) => {
    count++;
    return count === n ? `${p1}${p2}` : match;
  });
}

/**
 * Enable text auto-shrink on shapes containing specific replaced text.
 * This prevents long agent-generated text from overflowing text boxes.
 *
 * Strategy: Find the <p:sp> containing the given text, then ensure its
 * <a:bodyPr> has <a:normAutofit/> instead of <a:noAutofit/> or nothing.
 */
function enableAutoFitForText(xml: string, searchText: string, fontScale?: number): string {
  const safeSearch = searchText
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Find <p:sp> blocks containing this text
  const spPattern = /<p:sp>[\s\S]*?<\/p:sp>/g;
  return xml.replace(spPattern, (sp) => {
    if (!new RegExp(safeSearch).test(sp)) return sp;

    const normTag = fontScale
      ? `<a:normAutofit fontScale="${fontScale}"/>`
      : `<a:normAutofit/>`;

    let result = sp;

    // If already has normAutofit with a higher fontScale, replace with our lower one
    if (fontScale && result.includes('normAutofit')) {
      result = result.replace(
        /<a:normAutofit[^/]*\/>/g,
        normTag
      );
      return result;
    }

    // Replace <a:noAutofit/> with normAutofit
    result = result.replace(/<a:noAutofit\s*\/>/g, normTag);

    // If bodyPr is self-closing with no autofit child, add normAutofit
    if (!result.includes('normAutofit') && !result.includes('spAutoFit')) {
      // Handle <a:bodyPr/> → <a:bodyPr><a:normAutofit/></a:bodyPr>
      result = result.replace(/<a:bodyPr\/>/g, `<a:bodyPr>${normTag}</a:bodyPr>`);
      // Handle <a:bodyPr .../>  (self-closing with attrs)
      result = result.replace(/<a:bodyPr([^>]*)\/>/g, `<a:bodyPr$1>${normTag}</a:bodyPr>`);
      // Handle <a:bodyPr ...></a:bodyPr> (empty body)
      result = result.replace(/<a:bodyPr([^>]*)><\/a:bodyPr>/g, `<a:bodyPr$1>${normTag}</a:bodyPr>`);
    }

    return result;
  });
}

/**
 * Reduce font size of a specific text run in the XML.
 * Finds <a:rPr ... sz="XXXX"> before <a:t>text</a:t> and reduces sz.
 */
function reduceFontForText(xml: string, searchText: string, maxPt: number): string {
  const maxSz = maxPt * 100; // OOXML uses hundredths of a point
  const safeSearch = searchText
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Find <a:r> blocks containing this text and reduce sz
  const runPattern = /<a:r>[\s\S]*?<\/a:r>/g;
  return xml.replace(runPattern, (run) => {
    if (!new RegExp(safeSearch).test(run)) return run;
    // Replace sz values larger than maxSz
    return run.replace(/sz="(\d+)"/g, (m, sz) => {
      return parseInt(sz) > maxSz ? `sz="${maxSz}"` : m;
    });
  });
}

/**
 * Apply field-based replacements using the catalog placeholders.
 */
function applyFieldReplacements(
  xml: string,
  slide: AgentSlide,
  catalogFields: typeof AVANADE_TEMPLATE_CATALOG[0]['fields'],
): string {
  let result = xml;
  const fields = slide.fields || {};

  // Apply catalog-defined placeholder replacements
  for (const def of catalogFields) {
    const value = fields[def.fieldId];
    if (value && def.placeholder) {
      result = replaceTextInXml(result, def.placeholder, value);
    }
  }

  return result;
}

/**
 * Smart fallback replacement for slides without explicit field mapping.
 * Replaces largest text blocks with title, subtitle, bullets in order.
 */
function applySmartReplacement(xml: string, slide: AgentSlide): string {
  let result = xml;
  const runs = extractTextRuns(xml);
  if (runs.length === 0) return result;

  // Sort by length descending to find "title" candidates
  const sorted = [...runs].sort((a, b) => b.text.length - a.text.length);
  const usedTexts = new Set<string>();

  // Replace title → longest text
  if (slide.title && sorted.length > 0) {
    result = replaceTextInXml(result, sorted[0].text, slide.title);
    usedTexts.add(sorted[0].text);
  }

  // Replace subtitle → second longest
  if (slide.subtitle && sorted.length > 1) {
    result = replaceTextInXml(result, sorted[1].text, slide.subtitle);
    usedTexts.add(sorted[1].text);
  }

  // Replace bullets into remaining runs (document order)
  if (slide.bullets && slide.bullets.length > 0) {
    const remaining = runs.filter(r => !usedTexts.has(r.text));
    for (let i = 0; i < Math.min(slide.bullets.length, remaining.length); i++) {
      result = replaceTextInXml(result, remaining[i].text, slide.bullets[i]);
    }
  }

  return result;
}

/**
 * Duplicate a slide in the PPTX zip.
 */
async function duplicateSlide(zip: JSZip, srcNum: number, newNum: number): Promise<void> {
  const srcXml = await zip.file(`ppt/slides/slide${srcNum}.xml`)!.async('string');
  zip.file(`ppt/slides/slide${newNum}.xml`, srcXml);

  // Copy rels
  const srcRels = `ppt/slides/_rels/slide${srcNum}.xml.rels`;
  if (zip.file(srcRels)) {
    const rels = await zip.file(srcRels)!.async('string');
    zip.file(`ppt/slides/_rels/slide${newNum}.xml.rels`, rels);
  }

  // Content_Types
  let ct = await zip.file('[Content_Types].xml')!.async('string');
  if (!ct.includes(`/ppt/slides/slide${newNum}.xml`)) {
    ct = ct.replace('</Types>',
      `<Override PartName="/ppt/slides/slide${newNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>\n</Types>`);
    zip.file('[Content_Types].xml', ct);
  }

  // Presentation rels
  const prp = 'ppt/_rels/presentation.xml.rels';
  if (zip.file(prp)) {
    let pr = await zip.file(prp)!.async('string');
    const ids = Array.from(pr.matchAll(/rId(\d+)/g)).map(m => parseInt(m[1]));
    const newRId = `rId${Math.max(...ids) + 1}`;
    pr = pr.replace('</Relationships>',
      `<Relationship Id="${newRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${newNum}.xml"/>\n</Relationships>`);
    zip.file(prp, pr);

    // Presentation.xml sldId
    let px = await zip.file('ppt/presentation.xml')!.async('string');
    const sldIds = Array.from(px.matchAll(/id="(\d+)"/g)).map(m => parseInt(m[1]));
    const newSldId = Math.max(...sldIds, 256) + 1;
    px = px.replace(
      /(<p:sldId[^/]*\/>)\s*(<\/p:sldIdLst>)/,
      `$1\n      <p:sldId id="${newSldId}" r:id="${newRId}"/>\n    $2`
    );
    zip.file('ppt/presentation.xml', px);
  }
}

/**
 * Remove slides NOT in the keepSet from the PPTX zip.
 */
async function removeUnusedSlides(zip: JSZip, keepNums: Set<number>): Promise<void> {
  const allNums = Object.keys(zip.files)
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .map(f => parseInt(f.match(/slide(\d+)/)?.[1] || '0'))
    .filter(n => n > 0);

  const toRemove = allNums.filter(n => !keepNums.has(n));

  for (const num of toRemove) {
    zip.remove(`ppt/slides/slide${num}.xml`);
    if (zip.file(`ppt/slides/_rels/slide${num}.xml.rels`)) {
      zip.remove(`ppt/slides/_rels/slide${num}.xml.rels`);
    }
  }

  // Clean presentation.xml.rels
  const prp = 'ppt/_rels/presentation.xml.rels';
  if (zip.file(prp)) {
    let pr = await zip.file(prp)!.async('string');
    for (const num of toRemove) {
      pr = pr.replace(new RegExp(`<Relationship[^>]*Target="slides/slide${num}\\.xml"[^/]*/>\n?`, 'g'), '');
    }
    zip.file(prp, pr);
  }

  // Clean Content_Types
  let ct = await zip.file('[Content_Types].xml')!.async('string');
  for (const num of toRemove) {
    ct = ct.replace(new RegExp(`<Override[^>]*PartName="/ppt/slides/slide${num}\\.xml"[^/]*/>\n?`, 'g'), '');
  }
  zip.file('[Content_Types].xml', ct);
}

// --- Exec Report Layout Mapping ---

const EXEC_LAYOUT_MAP: Record<string, string> = {
  'title': 'er-cover',
  'cover': 'er-cover',
  'er-cover': 'er-cover',
  'exec-report': 'er-dashboard',
  'er-dashboard': 'er-dashboard',
  'dashboard-kpi': 'er-dashboard',
  'content': 'er-prototype',
  'er-prototype': 'er-prototype',
  'closing': 'er-closing',
  'er-closing': 'er-closing',
  'section-break': 'er-prototype',
};

function resolveExecLayoutId(slide: AgentSlide): string {
  const id = slide.layout_id || slide.layoutType || '';
  return EXEC_LAYOUT_MAP[id] || 'er-dashboard';
}

/**
 * Map execData (from agents) to template field names for the exec dashboard.
 */
function mapExecDataToTemplateFields(slide: AgentSlide): Record<string, string> {
  const exec = slide.execData || (slide as any).exec_data;
  const f = slide.fields || {};
  if (!exec && !Object.keys(f).length) {
    // Fallback: try to build minimal fields from slide title/subtitle
    return {
      case_name: slide.title || '',
      scenario: 'CENÁRIO CONSERVADOR',
    };
  }
  // Merge fields + exec_data (fields takes priority for flat keys, exec for detailed keys)
  const src = { ...exec, ...f };
  // Helper: truncate to max chars for template fit
  const trunc = (s: string, max: number) => s.length > max ? s.substring(0, max - 1) + '…' : s;
  return {
    case_name: trunc(src.case_name || src.problema || slide.title || '', 40),
    scenario: src.scenario || src.cenario || 'CENÁRIO CONSERVADOR',
    resultado_tangivel: trunc(src.resultado_tangivel || src.resultadoTangivel || '', 60),
    resultado_intangivel: trunc(src.resultado_intangivel || src.resultadoIntangivel || '', 60),
    aumento_receita: src.aumento_receita || src.aumentoReceita || '',
    reducao_custo: src.reducao_custo || src.reducaoCusto || '',
    eficiencia: src.eficiencia || src.eficiencia_operacional || src.eficienciaOperacional || '',
    investimento: src.investimento || src.investimento_total || src.investimentoTotal || '',
    roi: src.roi || src.roi_acumulado || src.roiAcumulado || '',
    vpl: src.vpl || '',
    tir: src.tir || '',
    hipotese: src.hipotese || '',
    payback_simples: src.payback_simples || src.paybackSimples || '',
    payback_descontado: src.payback_descontado || src.paybackDescontado || '',
    resultado_desc_1: src.resultado_desc_1 || src.resultado_tangivel || src.resultadoTangivel || '',
    resultado_desc_2: src.resultado_desc_2 || src.resultado_intangivel || src.resultadoIntangivel || '',
  };
}

/**
 * Specialized replacement for the exec report dashboard slide (slide 2).
 * Handles the complex structure with single-run and repeated placeholders.
 */
function applyExecDashboardReplacements(xml: string, fields: Record<string, string>): string {
  let result = xml;

  // 1. Simple single-run replacements (unique in the slide)
  const simpleReplacements: [string, string | undefined][] = [
    ['CENÁRIO CONSERVADOR', fields.scenario],
    ['[NOME DO CASE]', fields.case_name],
    ['[Resultado chave tangivel esperado]', fields.resultado_tangivel],
    ['[Resultado chave intangivel esperado e benefícios]', fields.resultado_intangivel],
    ['75%', fields.aumento_receita],
    ['7%', fields.reducao_custo],
    ['6%', fields.eficiencia],
  ];

  for (const [placeholder, value] of simpleReplacements) {
    if (value && value.trim()) {
      result = replaceTextInXml(result, placeholder, value);
    }
  }

  // 2. Repeated placeholders — replace from HIGHEST occurrence to LOWEST
  //    so positions don't shift after each replacement.
  //    R$x appears 2×: 1st = investimento, 2nd = VPL
  //    X% appears 2×: 1st = ROI, 2nd = TIR (note: "X% " with trailing space)
  if (fields.vpl && fields.vpl.trim()) {
    result = replaceNthTextInXml(result, 'R$x', fields.vpl, 2);
  }
  if (fields.investimento && fields.investimento.trim()) {
    result = replaceNthTextInXml(result, 'R$x', fields.investimento, 1);
  }
  if (fields.tir && fields.tir.trim()) {
    result = replaceNthTextInXml(result, 'X%', fields.tir, 2);
  }
  if (fields.roi && fields.roi.trim()) {
    result = replaceNthTextInXml(result, 'X%', fields.roi, 1);
  }

  // 3. Payback blocks — multi-run pattern: "Não" ... "atingido" ... "/" ... "atingido" ... "em 5" ... "anos"
  //    These span runs [31-38] (Payback Simples) and [54-61] (Payback Descontado)
  //    Strategy: Replace the entire payback text area with a single value.
  //    We use a regex that matches the sequence of <a:t> tags forming the payback block.
  //    "Não" → value, then blank all subsequent runs until "anos" (inclusive)
  const paybackSimples = fields.payback_simples || fields.paybackSimples;
  const paybackDescontado = fields.payback_descontado || fields.paybackDescontado;

  // Replace Nth "Não" with value and blank subsequent payback runs.
  // To avoid hitting ROI's "anos" (run 27), we specifically target "atingido" which
  // only appears in payback blocks, and "/" which only appears in payback blocks.
  if (paybackSimples && paybackSimples.trim()) {
    result = replaceNthTextInXml(result, 'Não', paybackSimples, 1);
    // Now blank the 1st occurrences of the payback-only tokens
    result = blankNthTextInXml(result, 'atingido', 1);
    result = blankNthTextInXml(result, '/', 1);
    result = blankNthTextInXml(result, 'atingido', 1);
    // "em 5 " and "anos" — but "anos" also appears in ROI block (run 27).
    // "em 5" is unique to payback blocks, so blank it and the NEXT "anos" after it.
    result = replaceNthTextInXml(result, 'em 5', '', 1);
    // Now find and blank the "anos" that comes after the payback region (run 38).
    // Since ROI "anos" (run 27) precedes payback, after blanking 1st "atingido" etc,
    // the 2nd "anos" in the XML is the payback one.
    result = blankNthTextInXml(result, 'anos', 2);
  }

  if (paybackDescontado && paybackDescontado.trim()) {
    result = replaceNthTextInXml(result, 'Não', paybackDescontado, 1);
    result = blankNthTextInXml(result, 'atingido', 1);
    result = blankNthTextInXml(result, '/', 1);
    result = blankNthTextInXml(result, 'atingido', 1);
    result = replaceNthTextInXml(result, 'em 5', '', 1);
    // After the first payback "anos" was blanked, the remaining payback "anos" is now the 2nd
    result = blankNthTextInXml(result, 'anos', 2);
  }

  // 4. "5 " + "anos" after ROI acumulado (runs [26-27]) — replace with period label
  if (fields.roi_periodo) {
    result = replaceNthTextInXml(result, '5', fields.roi_periodo, 1);
  }

  // 5. Hypothesis: [Descrição] — 1st occurrence is a single <a:t> run (run [63])
  if (fields.hipotese && fields.hipotese.trim()) {
    result = replaceTextInXml(result, '[Descrição]', fields.hipotese);
  }

  // 6. Resultados esperados — fragmented "[" + "Descrição" + "]" (runs [67-69] and [70-72])
  //    Strategy: put full text in the "Descrição" run, blank "[" and "]"
  const resDesc1 = fields.resultado_desc_1 || fields.resultado_tangivel || '';
  const resDesc2 = fields.resultado_desc_2 || fields.resultado_intangivel || '';

  if (resDesc1.trim()) {
    // 1st "[" before "Descrição" → blank
    result = replaceNthTextInXml(result, '[', '', 1);
    // 1st remaining "Descrição" → value
    result = replaceNthTextInXml(result, 'Descrição', resDesc1, 1);
    // 1st remaining "]" → blank
    result = replaceNthTextInXml(result, ']', '', 1);
  }

  if (resDesc2.trim()) {
    // 2nd "[" (now 1st remaining) → blank
    result = replaceNthTextInXml(result, '[', '', 1);
    // 2nd "Descrição" (now 1st remaining) → value
    result = replaceNthTextInXml(result, 'Descrição', resDesc2, 1);
    // 2nd "]" (now 1st remaining) → blank
    result = replaceNthTextInXml(result, ']', '', 1);
  }

  return result;
}

// --- Mapping from legacy layoutType to template layout_id ---
const LAYOUT_TYPE_MAP: Record<string, string> = {
  'title': 'cover',
  'content': 'content-2col',
  'two-column': 'content-2col',
  'section-break': 'section-divider',
  'quote': 'content-headers',
  'data': 'numbers',
  'closing': 'closing',
  'exec-report': 'dashboard-kpi',
};

function resolveLayoutId(slide: AgentSlide): string {
  if (slide.layout_id) return slide.layout_id;
  if (slide.layoutType) return LAYOUT_TYPE_MAP[slide.layoutType] || 'content-2col';
  return 'content-2col';
}

// --- Main Handler ---

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TemplateExportRequest;
    const { slides, title, category } = body;

    if (!slides?.length) {
      return NextResponse.json({ error: 'slides array is required' }, { status: 400 });
    }

    const isExec = category === 'relatorio-executivo';

    // Load the appropriate template based on category
    let templateBuffer: Buffer;
    if (body.templateBase64) {
      templateBuffer = Buffer.from(body.templateBase64, 'base64');
    } else if (isExec) {
      const execPath = path.join(process.cwd(), 'Docs', 'Relatorio Executivo - IT Forum.pptx');
      templateBuffer = fs.readFileSync(execPath);
    } else {
      const templatePath = path.join(process.cwd(), 'Docs', 'PowerPoint_Avanade_Padrão.pptx');
      templateBuffer = fs.readFileSync(templatePath);
    }

    const zip = await JSZip.loadAsync(templateBuffer);
    const existingCount = Object.keys(zip.files)
      .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;

    console.log(`[Template Export v2] ${isExec ? 'EXEC REPORT' : 'STANDARD'} — ${existingCount} template slides, ${slides.length} agent slides`);

    // === Build plan: for each agent slide, pick a template slide ===
    let nextNum = existingCount + 1;
    const usedOriginals = new Map<number, number>(); // srcNum → times used
    const plan: { agent: AgentSlide; slideNum: number }[] = [];

    for (const agentSlide of slides) {
      const layoutId = isExec ? resolveExecLayoutId(agentSlide) : resolveLayoutId(agentSlide);
      const catEntry = isExec
        ? getExecSlideByLayoutId(layoutId)
        : getSlideByLayoutId(layoutId);
      const srcNum = catEntry?.slideNum || (isExec ? 2 : 6);

      const timesUsed = usedOriginals.get(srcNum) || 0;
      if (timesUsed === 0) {
        // Use original
        usedOriginals.set(srcNum, 1);
        plan.push({ agent: { ...agentSlide, layout_id: layoutId }, slideNum: srcNum });
      } else {
        // Duplicate
        const newNum = nextNum++;
        await duplicateSlide(zip, srcNum, newNum);
        usedOriginals.set(srcNum, timesUsed + 1);
        plan.push({ agent: { ...agentSlide, layout_id: layoutId }, slideNum: newNum });
      }
    }

    // === Apply text replacements ===
    for (const p of plan) {
      const slidePath = `ppt/slides/slide${p.slideNum}.xml`;
      if (!zip.file(slidePath)) continue;

      let xml = await zip.file(slidePath)!.async('string');

      if (isExec && p.agent.layout_id === 'er-dashboard') {
        // Specialized exec dashboard replacement with KPI fields
        // Always use mapExecDataToTemplateFields which merges fields + execData
        const execFields = mapExecDataToTemplateFields(p.agent);
        xml = applyExecDashboardReplacements(xml, execFields);

        // Enable auto-fit for the case_name shape (36pt, no autofit by default)
        if (execFields.case_name) {
          xml = enableAutoFitForText(xml, execFields.case_name, 40000); // fontScale 40%
          // If case_name is very long, also cap font size to 24pt
          if (execFields.case_name.length > 25) {
            xml = reduceFontForText(xml, execFields.case_name, 24);
          }
        }
      } else if (isExec && (p.agent.layout_id === 'er-cover' || p.agent.layout_id === 'er-prototype')) {
        // Exec cover and prototype — use catalog field replacement
        const catEntry = getExecSlideByLayoutId(p.agent.layout_id);
        if (catEntry) {
          // For cover: map title/subtitle to client/experience if no explicit fields
          let fields = p.agent.fields || {};
          if (p.agent.layout_id === 'er-cover' && (!fields.client || !fields.title)) {
            fields = {
              title: fields.title || 'Relatório Executivo',
              client: fields.client || p.agent.title || title || '',
              experience: fields.experience || p.agent.subtitle || '',
            };
          }

          // Truncate cover fields to avoid overflow (template has 73pt font)
          if (p.agent.layout_id === 'er-cover') {
            fields = {
              ...fields,
              client: (fields.client || '').substring(0, 30),
              experience: (fields.experience || '').substring(0, 35),
            };
          }

          xml = applyFieldReplacements(xml, { ...p.agent, fields }, catEntry.fields);

          // Cover: reduce font size and enable auto-fit for variable-length text
          if (p.agent.layout_id === 'er-cover') {
            const clientText = fields.client || '';
            const expText = fields.experience || '';
            // Cap cover client/experience font to 44pt (original is 73pt — way too big)
            if (clientText) xml = reduceFontForText(xml, clientText, 44);
            if (expText) xml = reduceFontForText(xml, expText, 44);
            // Enable auto-fit with 50% minimum scale
            xml = enableAutoFitForText(xml, clientText || expText, 50000);
          }
        }
      } else if (!isExec) {
        // Standard Avanade template logic
        const catEntry = getSlideByLayoutId(p.agent.layout_id!);
        if (catEntry && p.agent.fields && Object.keys(p.agent.fields).length > 0) {
          xml = applyFieldReplacements(xml, p.agent, catEntry.fields);
        } else {
          xml = applySmartReplacement(xml, p.agent);
        }
      }

      zip.file(slidePath, xml);
      const label = p.agent.fields?.title || p.agent.fields?.case_name || p.agent.title || '?';
      console.log(`[Template Export v2] slide${p.slideNum} (${p.agent.layout_id}): "${label}"`);
    }

    // === Remove unused template slides ===
    const keepNums = new Set(plan.map(p => p.slideNum));
    await removeUnusedSlides(zip, keepNums);

    // === Generate output ===
    const outputBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const fileName = title
      .replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);

    console.log(`[Template Export v2] Output size: ${(outputBuffer.length / 1024 / 1024).toFixed(1)}MB`);

    // Stream the response to handle large PPTX files (80-120MB)
    const stream = new ReadableStream({
      start(controller) {
        // Send in 1MB chunks to avoid memory issues
        const CHUNK = 1024 * 1024;
        let offset = 0;
        while (offset < outputBuffer.length) {
          const end = Math.min(offset + CHUNK, outputBuffer.length);
          controller.enqueue(new Uint8Array(outputBuffer.slice(offset, end)));
          offset = end;
        }
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${fileName}.pptx"`,
        'Content-Length': String(outputBuffer.length),
      },
    });
  } catch (err: any) {
    console.error('[Template Export v2] Error:', err);
    return NextResponse.json({ error: err.message || 'Template export failed' }, { status: 500 });
  }
}
