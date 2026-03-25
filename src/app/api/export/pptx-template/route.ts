// ============================================
// DeckForge — Template Export Engine v2
// Uses the built-in Avanade template catalog to clone slides
// and replace text intelligently, like a human would.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { AVANADE_TEMPLATE_CATALOG, getSlideByLayoutId } from '@/lib/template-catalog';

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
    const { slides, title } = body;

    if (!slides?.length) {
      return NextResponse.json({ error: 'slides array is required' }, { status: 400 });
    }

    // Load the built-in Avanade template from Docs folder
    const templatePath = path.join(process.cwd(), 'Docs', 'PowerPoint_Avanade_Padrão.pptx');
    let templateBuffer: Buffer;
    if (body.templateBase64) {
      templateBuffer = Buffer.from(body.templateBase64, 'base64');
    } else {
      templateBuffer = fs.readFileSync(templatePath);
    }

    const zip = await JSZip.loadAsync(templateBuffer);
    const existingCount = Object.keys(zip.files)
      .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;

    console.log(`[Template Export v2] ${existingCount} template slides, ${slides.length} agent slides`);

    // === Build plan: for each agent slide, pick a template slide ===
    let nextNum = existingCount + 1;
    const usedOriginals = new Map<number, number>(); // srcNum → times used
    const plan: { agent: AgentSlide; slideNum: number }[] = [];

    for (const agentSlide of slides) {
      const layoutId = resolveLayoutId(agentSlide);
      const catEntry = getSlideByLayoutId(layoutId);
      const srcNum = catEntry?.slideNum || 6; // fallback to content-2col

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
      const catEntry = getSlideByLayoutId(p.agent.layout_id);

      if (catEntry && p.agent.fields && Object.keys(p.agent.fields).length > 0) {
        // Preferred: explicit field-based replacement
        xml = applyFieldReplacements(xml, p.agent, catEntry.fields);
      } else {
        // Fallback: smart replacement using title/subtitle/bullets
        xml = applySmartReplacement(xml, p.agent);
      }

      zip.file(slidePath, xml);
      const label = p.agent.fields?.title || p.agent.title || '?';
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
