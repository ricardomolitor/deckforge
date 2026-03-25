// ============================================
// DeckForge — Template Export Engine v2
// Uses the built-in Avanade template catalog to clone slides
// and replace text intelligently, like a human would.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
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
  const pattern = new RegExp(`(<a:t[^>]*>)${escaped}(</a:t>)`, 'g');
  let count = 0;
  return xml.replace(pattern, (match, p1, p2) => {
    count++;
    return count === n ? `${p1}${safeNew}${p2}` : match;
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
  if (!exec) {
    // Fallback: try to build minimal fields from slide title/subtitle
    return {
      case_name: slide.title || '',
      scenario: 'CENÁRIO CONSERVADOR',
    };
  }
  return {
    case_name: exec.problema || exec.case_name || slide.title || '',
    scenario: exec.scenario || exec.cenario || 'CENÁRIO CONSERVADOR',
    resultado_tangivel: exec.resultadoTangivel || exec.resultado_tangivel || '',
    resultado_intangivel: exec.resultadoIntangivel || exec.resultado_intangivel || '',
    aumento_receita: exec.aumentoReceita || exec.aumento_receita || '',
    reducao_custo: exec.reducaoCusto || exec.reducao_custo || '',
    eficiencia: exec.eficienciaOperacional || exec.eficiencia_operacional || '',
    investimento: exec.investimentoTotal || exec.investimento_total || '',
    roi: exec.roiAcumulado || exec.roi_acumulado || '',
    vpl: exec.vpl || '',
    tir: exec.tir || '',
    hipotese: exec.hipotese || '',
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
  //    X% appears 2×: 1st = ROI, 2nd = TIR
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

  // 3. Hypothesis: [Descrição] — 1st occurrence is a single <a:t> run
  if (fields.hipotese && fields.hipotese.trim()) {
    result = replaceTextInXml(result, '[Descrição]', fields.hipotese);
    // Remaining "Descrição" fragments (split runs) — replace if we have resultado descriptions
    if (fields.resultado_desc_1) {
      result = replaceNthTextInXml(result, 'Descrição', fields.resultado_desc_1, 1);
    }
    if (fields.resultado_desc_2) {
      result = replaceNthTextInXml(result, 'Descrição', fields.resultado_desc_2, 1);
    }
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
        const execFields = (p.agent.fields && Object.keys(p.agent.fields).length > 0)
          ? p.agent.fields
          : mapExecDataToTemplateFields(p.agent);
        xml = applyExecDashboardReplacements(xml, execFields);
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
          xml = applyFieldReplacements(xml, { ...p.agent, fields }, catEntry.fields);
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

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${fileName}.pptx"`,
      },
    });
  } catch (err: any) {
    console.error('[Template Export v2] Error:', err);
    return NextResponse.json({ error: err.message || 'Template export failed' }, { status: 500 });
  }
}
