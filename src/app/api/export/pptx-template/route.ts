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
import { EXEC_REPORT_CATALOG, getExecSlideByLayoutId, BUSINESS_CASE_CATALOG, getBusinessCaseSlideByLayoutId } from '@/lib/template-catalog';

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
 * ═══════════════════════════════════════════════════════════
 * PROPORTIONAL TEXT ENGINE — "Como um humano editaria o PPT"
 * ═══════════════════════════════════════════════════════════
 *
 * Real measurements from "Relatório Executivo - IT Forum.pptx" template:
 *
 * COVER (slide 1):
 *   All 3 texts in 1 shape, bodyPr: normAutofit@90%, font 73pt
 *   Box: entire slide width — but 73pt is too large for variable text
 *
 * DASHBOARD (slide 2) — text box geometry:
 *   case_name:       12.78cm × 2.06cm, usable 12.27×1.80cm, orig 36pt → ~17 chars/line
 *   problema:         4.89cm × auto,    usable 4.38cm wide, 14pt → ~16 chars/line
 *   hipotese:         4.89cm × auto,    usable 4.38cm wide, 14pt → ~16 chars/line
 *   solucao:          9.53cm × 2.74cm,  usable 9.02×2.49cm, 18pt → ~25 chars/line, 3 lines
 *   investimento/vpl: 6.12cm × 1.62cm,  usable 5.61×1.37cm, 32pt → ~10 chars
 *   roi/tir:          6.12cm × 1.62cm,  usable 5.61×1.37cm, 32pt → ~10 chars
 *   payback:          6.12cm × 2.31cm,  usable 5.61×2.05cm, 16pt → ~36 chars
 *   resultado:        8.60cm × 3.85cm,  usable 8.09×3.59cm, 14pt → ~29 chars/line, 5 lines
 *   descricao_hip:    8.60cm × auto,    usable 8.09cm wide, 14pt → ~29 chars/line
 *   descricao_prob:   4.89cm × auto,    usable 4.38cm wide, 14pt → ~16 chars/line
 */

// --- Text Box Specs (from template measurements) ---
interface TextBoxSpec {
  widthCm: number;       // usable width in cm
  heightCm: number;      // usable height in cm (0 = auto-grow)
  origFontPt: number;    // template's design font size
  targetFontPt: number;  // max font for generated content (≤ origFontPt)
  maxLines: number;      // max lines that fit at targetFont
  charsPerLine: number;  // chars per line at targetFont
}

const EXEC_TEXT_SPECS: Record<string, TextBoxSpec> = {
  // Cover — template uses 73pt but that's for 1-word titles; generated content needs ≤44pt
  'cover_client':    { widthCm: 30, heightCm: 3, origFontPt: 73, targetFontPt: 44, maxLines: 1, charsPerLine: 30 },
  'cover_experience':{ widthCm: 30, heightCm: 3, origFontPt: 73, targetFontPt: 44, maxLines: 1, charsPerLine: 30 },
  // Dashboard — dynamic content needs proportional fitting
  'case_name':       { widthCm: 12.27, heightCm: 1.80, origFontPt: 36, targetFontPt: 28, maxLines: 2, charsPerLine: 22 },
  'problema':        { widthCm: 4.38,  heightCm: 3.0,  origFontPt: 14, targetFontPt: 14, maxLines: 4, charsPerLine: 16 },
  'hipotese':        { widthCm: 4.38,  heightCm: 3.0,  origFontPt: 14, targetFontPt: 14, maxLines: 4, charsPerLine: 16 },
  'solucao':         { widthCm: 9.02,  heightCm: 2.49, origFontPt: 18, targetFontPt: 18, maxLines: 3, charsPerLine: 25 },
  'investimento':    { widthCm: 5.61,  heightCm: 1.37, origFontPt: 32, targetFontPt: 28, maxLines: 1, charsPerLine: 10 },
  'vpl':             { widthCm: 5.61,  heightCm: 1.37, origFontPt: 32, targetFontPt: 28, maxLines: 1, charsPerLine: 10 },
  'roi':             { widthCm: 5.61,  heightCm: 1.37, origFontPt: 32, targetFontPt: 28, maxLines: 1, charsPerLine: 10 },
  'tir':             { widthCm: 5.61,  heightCm: 1.37, origFontPt: 32, targetFontPt: 28, maxLines: 1, charsPerLine: 10 },
  'payback':         { widthCm: 5.61,  heightCm: 2.05, origFontPt: 16, targetFontPt: 14, maxLines: 2, charsPerLine: 20 },
  'resultado':       { widthCm: 8.09,  heightCm: 3.59, origFontPt: 14, targetFontPt: 14, maxLines: 5, charsPerLine: 29 },
  'descricao_hip':   { widthCm: 8.09,  heightCm: 1.5,  origFontPt: 14, targetFontPt: 12, maxLines: 3, charsPerLine: 33 },
  'descricao_prob':  { widthCm: 4.38,  heightCm: 1.5,  origFontPt: 14, targetFontPt: 12, maxLines: 3, charsPerLine: 19 },
};

// ═══════════════════════════════════════════════════════
// BUSINESS CASE TEMPLATE — Text Box Specs
// From Copy-of-Impact-Report.pptx measurements
// ═══════════════════════════════════════════════════════

const BC_TEXT_SPECS: Record<string, TextBoxSpec> = {
  // SLIDE 1 — Cover
  // title: 14.26×3.41cm, font 98pt Outfit, lineSpacing 122.5pt, wrap=square
  'bc-cover.title':        { widthCm: 14.26, heightCm: 3.41, origFontPt: 98, targetFontPt: 54, maxLines: 2, charsPerLine: 30 },
  // subtitle: 11.28×0.51cm, font 29pt Outfit, lineSpacing 36.5pt, wrap=none
  'bc-cover.subtitle':     { widthCm: 11.28, heightCm: 0.51, origFontPt: 29, targetFontPt: 22, maxLines: 1, charsPerLine: 40 },
  // context_line: 14.26×0.30cm, font 14pt Cabin, wrap=none
  'bc-cover.context_line': { widthCm: 14.26, heightCm: 0.30, origFontPt: 14, targetFontPt: 14, maxLines: 1, charsPerLine: 80 },

  // SLIDE 2 — Context
  // title: 9.92×0.85cm, 49pt, wrap=none
  'bc-context.title':           { widthCm: 9.92,  heightCm: 0.85, origFontPt: 49, targetFontPt: 36, maxLines: 1, charsPerLine: 22 },
  // summary: 13.21×0.37cm, 17.5pt, wrap=none
  'bc-context.summary':         { widthCm: 13.21, heightCm: 0.37, origFontPt: 17.5, targetFontPt: 15, maxLines: 1, charsPerLine: 65 },
  // section headings: 3.41×0.43cm, 24.5pt, wrap=none
  'bc-context.section_heading': { widthCm: 3.41,  heightCm: 0.43, origFontPt: 24.5, targetFontPt: 20, maxLines: 1, charsPerLine: 14 },
  // section bodies: 4.08×1.95cm, 17.5pt, wrap=square
  'bc-context.section_body':    { widthCm: 4.08,  heightCm: 1.95, origFontPt: 17.5, targetFontPt: 15, maxLines: 4, charsPerLine: 22 },

  // SLIDE 3 — Solution
  // title: 11.84×0.72cm, 41.5pt, wrap=none
  'bc-solution.title':          { widthCm: 11.84, heightCm: 0.72, origFontPt: 41.5, targetFontPt: 32, maxLines: 1, charsPerLine: 28 },
  // summary: 13.37×0.29cm, 15pt, wrap=none
  'bc-solution.summary':        { widthCm: 13.37, heightCm: 0.29, origFontPt: 15,   targetFontPt: 15, maxLines: 1, charsPerLine: 70 },
  // impact values: 2.83×0.70cm, 50pt, wrap=none
  'bc-solution.impact_value':   { widthCm: 2.83,  heightCm: 0.70, origFontPt: 50, targetFontPt: 40, maxLines: 1, charsPerLine: 6 },
  // impact labels: 2.90×0.36cm, 20.5pt, wrap=none
  'bc-solution.impact_label':   { widthCm: 2.90,  heightCm: 0.36, origFontPt: 20.5, targetFontPt: 18, maxLines: 1, charsPerLine: 14 },
  // impact details: 3.33×0.29cm, 15pt, wrap=none
  'bc-solution.impact_detail':  { widthCm: 3.33,  heightCm: 0.29, origFontPt: 15,   targetFontPt: 13, maxLines: 1, charsPerLine: 20 },

  // SLIDE 4 — Benchmarks
  // title: 10.48×0.68cm, 39pt, wrap=none
  'bc-benchmarks.title':        { widthCm: 10.48, heightCm: 0.68, origFontPt: 39, targetFontPt: 30, maxLines: 1, charsPerLine: 28 },
  // summary: 13.42×0.27cm, 14pt, wrap=none
  'bc-benchmarks.summary':      { widthCm: 13.42, heightCm: 0.27, origFontPt: 14, targetFontPt: 14, maxLines: 1, charsPerLine: 75 },

  // SLIDE 5 — Impact
  // title: 11.78×0.77cm, 44pt, wrap=none
  'bc-impact.title':            { widthCm: 11.78, heightCm: 0.77, origFontPt: 44, targetFontPt: 34, maxLines: 1, charsPerLine: 28 },
  // summary: 13.32×0.32cm, 16pt, wrap=none
  'bc-impact.summary':          { widthCm: 13.32, heightCm: 0.32, origFontPt: 16, targetFontPt: 16, maxLines: 1, charsPerLine: 65 },
  // benefit headings: 3.72×0.38cm, 22pt, wrap=none
  'bc-impact.benefit_heading':  { widthCm: 3.72,  heightCm: 0.38, origFontPt: 22, targetFontPt: 18, maxLines: 1, charsPerLine: 16 },
  // benefit values: 3.04×0.74cm, 53pt, wrap=none
  'bc-impact.benefit_value':    { widthCm: 3.04,  heightCm: 0.74, origFontPt: 53, targetFontPt: 42, maxLines: 1, charsPerLine: 6 },
  // benefit labels: 3.07×0.38cm, 22pt, wrap=none
  'bc-impact.benefit_label':    { widthCm: 3.07,  heightCm: 0.38, origFontPt: 22, targetFontPt: 18, maxLines: 1, charsPerLine: 12 },

  // SLIDE 6 — Waterfall
  // title: 12.74×0.68cm, 39pt, wrap=none
  'bc-waterfall.title':           { widthCm: 12.74, heightCm: 0.68, origFontPt: 39, targetFontPt: 30, maxLines: 1, charsPerLine: 32 },
  // summary: 13.42×0.27cm, 14pt, wrap=none
  'bc-waterfall.summary':         { widthCm: 13.42, heightCm: 0.27, origFontPt: 14, targetFontPt: 14, maxLines: 1, charsPerLine: 75 },
  // highlight values: 3.70×0.65cm, 47pt, wrap=none
  'bc-waterfall.highlight_value': { widthCm: 3.70,  heightCm: 0.65, origFontPt: 47, targetFontPt: 38, maxLines: 1, charsPerLine: 8 },
  // highlight labels: 3.20×0.34cm, 19.5pt, wrap=none
  'bc-waterfall.highlight_label': { widthCm: 3.20,  heightCm: 0.34, origFontPt: 19.5, targetFontPt: 16, maxLines: 1, charsPerLine: 16 },
};

/**
 * Calculate optimal font size and fontScale for a given text in a known text box.
 * Works like a human designer:
 *  1. If template font > target → always reduce to target (e.g. 73pt cover → 44pt)
 *  2. If text fits at target font → use target font
 *  3. If text overflows at target font → reduce proportionally until it fits
 *
 * Returns: { fontPt, fontScale, shouldApply }
 */
function calcProportionalFit(text: string, specId: string): {
  fontPt: number;
  fontScale: number; // 0-100000 (OOXML scale)
  shouldApply: boolean;
} {
  const spec = EXEC_TEXT_SPECS[specId] || BC_TEXT_SPECS[specId];
  if (!spec) return { fontPt: 14, fontScale: 100000, shouldApply: false };

  const textLen = text.length;
  const maxChars = spec.charsPerLine * spec.maxLines;
  const needsReduction = spec.targetFontPt < spec.origFontPt; // always reduce cover, kpi fonts

  // Text fits at target font size
  if (textLen <= maxChars) {
    if (needsReduction) {
      // Template font is too big (e.g. 73pt) → reduce to target even for short text
      const fontScale = Math.round((spec.targetFontPt / spec.origFontPt) * 100000);
      return { fontPt: spec.targetFontPt, fontScale, shouldApply: true };
    }
    return { fontPt: spec.targetFontPt, fontScale: 100000, shouldApply: false };
  }

  // Text overflows — calculate proportional shrink from targetFont (not origFont)
  const overflowRatio = textLen / maxChars;
  const shrinkFactor = Math.sqrt(overflowRatio); // sqrt because both lines & chars/line grow
  let newFontPt = Math.round(spec.targetFontPt / shrinkFactor);

  // Enforce minimum readability
  const minFont = spec.targetFontPt >= 28 ? 16 : spec.targetFontPt >= 18 ? 11 : 9;
  newFontPt = Math.max(newFontPt, minFont);

  // Calculate fontScale relative to ORIGINAL font (what PowerPoint sees)
  const fontScale = Math.round((newFontPt / spec.origFontPt) * 100000);

  return {
    fontPt: newFontPt,
    fontScale: Math.max(fontScale, 20000), // never go below 20%
    shouldApply: true,
  };
}

/**
 * Enable text auto-shrink on shapes containing specific replaced text.
 * Sets normAutofit with calculated fontScale.
 */
function enableAutoFitForText(xml: string, searchText: string, fontScale?: number): string {
  const safeSearch = searchText
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const spPattern = /<p:sp>[\s\S]*?<\/p:sp>/g;
  return xml.replace(spPattern, (sp) => {
    if (!new RegExp(safeSearch).test(sp)) return sp;

    const normTag = fontScale
      ? `<a:normAutofit fontScale="${fontScale}"/>`
      : `<a:normAutofit/>`;

    let result = sp;

    // Replace existing normAutofit with our calculated scale
    if (result.includes('normAutofit')) {
      result = result.replace(/<a:normAutofit[^/]*\/>/g, normTag);
      return result;
    }

    // Replace noAutofit
    result = result.replace(/<a:noAutofit\s*\/>/g, normTag);

    // Replace spAutoFit with normAutofit when we have a specific fontScale
    // (spAutoFit auto-grows the shape; normAutofit shrinks text to fit — we want the latter)
    if (fontScale && result.includes('spAutoFit')) {
      result = result.replace(/<a:spAutoFit\s*\/>/g, normTag);
    }

    // Handle bodyPr without any autofit setting
    if (!result.includes('normAutofit') && !result.includes('spAutoFit')) {
      result = result.replace(/<a:bodyPr\/>/g, `<a:bodyPr>${normTag}</a:bodyPr>`);
      result = result.replace(/<a:bodyPr([^>]*)\/>/g, `<a:bodyPr$1>${normTag}</a:bodyPr>`);
      result = result.replace(/<a:bodyPr([^>]*)><\/a:bodyPr>/g, `<a:bodyPr$1>${normTag}</a:bodyPr>`);
    }

    return result;
  });
}

/**
 * Set font size on all <a:rPr> in runs containing the given text.
 */
function setFontForText(xml: string, searchText: string, fontPt: number): string {
  const sz = fontPt * 100;
  const safeSearch = searchText
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const runPattern = /<a:r>[\s\S]*?<\/a:r>/g;
  return xml.replace(runPattern, (run) => {
    if (!new RegExp(safeSearch).test(run)) return run;
    // Replace existing sz with new value, but only if larger
    return run.replace(/sz="(\d+)"/g, (m, oldSz) => {
      return parseInt(oldSz) > sz ? `sz="${sz}"` : m;
    });
  });
}

/**
 * Adjust line spacing (<a:spcPts>) in shapes containing specific text.
 * Scales lineSpacing proportionally when font is reduced — prevents giant
 * gaps (e.g. 122.5pt line spacing at 98pt font → 67pt at 54pt font).
 */
function adjustLineSpacingForText(
  xml: string,
  searchText: string,
  origFontPt: number,
  newFontPt: number,
): string {
  if (newFontPt >= origFontPt) return xml;

  const safeSearch = searchText
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const spPattern = /<p:sp>[\s\S]*?<\/p:sp>/g;
  return xml.replace(spPattern, (sp) => {
    if (!new RegExp(safeSearch).test(sp)) return sp;
    // Scale all spcPts in this shape proportionally to font reduction
    const ratio = newFontPt / origFontPt;
    return sp.replace(/<a:spcPts val="(\d+)"\/>/g, (_m, val) => {
      const newVal = Math.round(parseInt(val) * ratio);
      return `<a:spcPts val="${newVal}"/>`;
    });
  });
}

/**
 * Change wrap mode from "none" to "square" for shapes containing specific text.
 * Prevents long single-line text from extending beyond the text box boundary.
 */
function enableWrapForText(xml: string, searchText: string): string {
  const safeSearch = searchText
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const spPattern = /<p:sp>[\s\S]*?<\/p:sp>/g;
  return xml.replace(spPattern, (sp) => {
    if (!new RegExp(safeSearch).test(sp)) return sp;
    return sp.replace(/wrap="none"/, 'wrap="square"');
  });
}

/**
 * Apply proportional sizing to a specific field in the exec report.
 * Like a human designer: checks text length vs box capacity, adjusts font + autofit.
 */
function applyProportionalSizing(xml: string, text: string, specId: string): string {
  if (!text || !text.trim()) return xml;

  const fit = calcProportionalFit(text, specId);
  let result = xml;

  if (fit.shouldApply) {
    result = enableAutoFitForText(result, text, fit.fontScale);
    result = setFontForText(result, text, fit.fontPt);
  }

  return result;
}

/**
 * Apply field-based replacements using the catalog placeholders.
 */
function applyFieldReplacements(
  xml: string,
  slide: AgentSlide,
  catalogFields: typeof EXEC_REPORT_CATALOG[0]['fields'],
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

// --- Business Case Layout Mapping ---

const BUSINESS_CASE_LAYOUT_MAP: Record<string, string> = {
  'title': 'bc-cover',
  'cover': 'bc-cover',
  'bc-cover': 'bc-cover',
  'bc-context': 'bc-context',
  'bc-solution': 'bc-solution',
  'bc-benchmarks': 'bc-benchmarks',
  'bc-impact': 'bc-impact',
  'bc-waterfall': 'bc-waterfall',
  'content': 'bc-context',
  'data': 'bc-benchmarks',
  'closing': 'bc-waterfall',
};

function resolveBusinessCaseLayoutId(slide: AgentSlide): string {
  const id = slide.layout_id || slide.layoutType || '';
  return BUSINESS_CASE_LAYOUT_MAP[id] || 'bc-context';
}

/**
 * Apply field-based replacements for Business Case slides.
 * Handles the text substitution for all 6 bc-* layouts using catalog placeholders.
 */
function applyBusinessCaseReplacements(
  xml: string,
  slide: AgentSlide,
  layoutId: string,
): string {
  const catEntry = getBusinessCaseSlideByLayoutId(layoutId);
  if (!catEntry) {
    console.log(`[BC-DEBUG] ❌ No catalog entry for layoutId="${layoutId}"`);
    return xml;
  }

  const fields = slide.fields || {};
  const fieldKeys = Object.keys(fields);
  console.log(`[BC-DEBUG] Layout="${layoutId}" | slide.fields keys: [${fieldKeys.join(', ')}] (${fieldKeys.length} fields)`);
  console.log(`[BC-DEBUG] Catalog expects ${catEntry.fields.length} fields: [${catEntry.fields.map(f => f.fieldId).join(', ')}]`);

  let result = xml;
  let replacedCount = 0;
  let skippedCount = 0;

  // Apply catalog-defined placeholder replacements
  for (const def of catEntry.fields) {
    const value = fields[def.fieldId];
    if (value && def.placeholder) {
      const before = result;
      result = replaceTextInXml(result, def.placeholder, value);
      if (result !== before) {
        replacedCount++;
        console.log(`[BC-DEBUG]   ✅ ${def.fieldId}: "${def.placeholder.slice(0, 40)}…" → "${String(value).slice(0, 40)}…"`);
      } else {
        console.log(`[BC-DEBUG]   ⚠️ ${def.fieldId}: placeholder NOT FOUND in XML: "${def.placeholder.slice(0, 50)}…"`);
      }
    } else {
      skippedCount++;
      console.log(`[BC-DEBUG]   ⏭️ ${def.fieldId}: skipped (value=${value ? 'exists' : 'EMPTY'}, placeholder=${def.placeholder ? 'yes' : 'NO'})`);
    }
  }
  console.log(`[BC-DEBUG] Layout="${layoutId}" DONE: ${replacedCount} replaced, ${skippedCount} skipped, ${catEntry.fields.length - replacedCount - skippedCount} not-found`);

  return result;
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
  // Helper: truncate to max chars — limits based on real template text box dimensions
  const trunc = (s: string, max: number) => s.length > max ? s.substring(0, max - 1) + '…' : s;

  // Proportional limits from EXEC_TEXT_SPECS (charsPerLine × maxLines):
  // case_name: 17×2 = 34 chars    | problema: 16×4 = 64 chars
  // hipotese: 16×4 = 64 chars     | solucao: 25×3 = 75 chars
  // resultado: 29×5 = 145 chars   | investimento/vpl/roi/tir: 10 chars
  // payback: 18×2 = 36 chars      | descricao_hip: 29×3 = 87 chars
  // descricao_prob: 16×3 = 48 chars
  return {
    case_name: trunc(src.case_name || src.problema || slide.title || '', 34),
    scenario: src.scenario || src.cenario || 'CENÁRIO CONSERVADOR',
    resultado_tangivel: trunc(src.resultado_tangivel || src.resultadoTangivel || '', 145),
    resultado_intangivel: trunc(src.resultado_intangivel || src.resultadoIntangivel || '', 145),
    aumento_receita: trunc(src.aumento_receita || src.aumentoReceita || '', 5),
    reducao_custo: trunc(src.reducao_custo || src.reducaoCusto || '', 5),
    eficiencia: trunc(src.eficiencia || src.eficiencia_operacional || src.eficienciaOperacional || '', 5),
    investimento: trunc(src.investimento || src.investimento_total || src.investimentoTotal || '', 10),
    roi: trunc(src.roi || src.roi_acumulado || src.roiAcumulado || '', 10),
    vpl: trunc(src.vpl || '', 10),
    tir: trunc(src.tir || '', 10),
    hipotese: trunc(src.hipotese || '', 64),
    payback_simples: trunc(src.payback_simples || src.paybackSimples || '', 36),
    payback_descontado: trunc(src.payback_descontado || src.paybackDescontado || '', 36),
    resultado_desc_1: trunc(src.resultado_desc_1 || src.resultado_tangivel || src.resultadoTangivel || '', 145),
    resultado_desc_2: trunc(src.resultado_desc_2 || src.resultado_intangivel || src.resultadoIntangivel || '', 145),
    // Extra fields consumed by applyExecDashboardReplacements for [Descrição] placeholders
    descricao_hipotese: trunc(src.descricao_hipotese || src.hipotese || '', 87),
    descricao_problema: trunc(src.descricao_problema || src.problema || '', 48),
    problema: trunc(src.problema || '', 64),
    solucao: trunc(src.solucao || '', 75),
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
// --- Main Handler ---

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TemplateExportRequest;
    const { slides, title, category } = body;

    if (!slides?.length) {
      return NextResponse.json({ error: 'slides array is required' }, { status: 400 });
    }

    const isExec = category === 'relatorio-executivo';
    const isBusinessCase = category === 'business-case';

    // Debug: log what data arrived from the frontend
    if (isBusinessCase) {
      console.log(`\n[BC-DEBUG] ========== EXPORT REQUEST ==========`);
      console.log(`[BC-DEBUG] category="${category}", ${slides.length} slides`);
      for (const s of slides) {
        const fKeys = s.fields ? Object.keys(s.fields) : [];
        console.log(`[BC-DEBUG] Slide order=${s.order} layout_id="${s.layout_id}" layoutType="${s.layoutType}" title="${(s.title || '').slice(0, 40)}" fields=${fKeys.length} [${fKeys.slice(0, 5).join(',')}${fKeys.length > 5 ? '...' : ''}]`);
      }
      console.log(`[BC-DEBUG] ========================================\n`);
    }

    // Load the appropriate template based on category
    let templateBuffer: Buffer;
    if (body.templateBase64) {
      templateBuffer = Buffer.from(body.templateBase64, 'base64');
    } else if (isExec) {
      const execPath = path.join(process.cwd(), 'Docs', 'Relatorio Executivo - IT Forum.pptx');
      templateBuffer = fs.readFileSync(execPath);
    } else {
      // Default: Business Case
      const bcPath = path.join(process.cwd(), 'Copy-of-Impact-Report.pptx');
      templateBuffer = fs.readFileSync(bcPath);
    }

    const zip = await JSZip.loadAsync(templateBuffer);
    const existingCount = Object.keys(zip.files)
      .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;

    console.log(`[Template Export v2] ${isExec ? 'EXEC REPORT' : 'BUSINESS CASE'} — ${existingCount} template slides, ${slides.length} agent slides`);

    // === Build plan: for each agent slide, pick a template slide ===
    let nextNum = existingCount + 1;
    const usedOriginals = new Map<number, number>(); // srcNum → times used
    const plan: { agent: AgentSlide; slideNum: number }[] = [];

    for (const agentSlide of slides) {
      const layoutId = isExec
        ? resolveExecLayoutId(agentSlide)
        : resolveBusinessCaseLayoutId(agentSlide);
      const catEntry = isExec
        ? getExecSlideByLayoutId(layoutId)
        : getBusinessCaseSlideByLayoutId(layoutId);
      const srcNum = catEntry?.slideNum || (isExec ? 2 : 2);

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
        // ══════ DASHBOARD — Proportional Intelligence ══════
        const execFields = mapExecDataToTemplateFields(p.agent);
        xml = applyExecDashboardReplacements(xml, execFields);

        // Apply proportional sizing to EVERY variable-text field
        if (execFields.case_name) {
          xml = applyProportionalSizing(xml, execFields.case_name, 'case_name');
        }
        if (execFields.resultado_tangivel) {
          xml = applyProportionalSizing(xml, execFields.resultado_tangivel, 'resultado');
        }
        if (execFields.resultado_intangivel) {
          xml = applyProportionalSizing(xml, execFields.resultado_intangivel, 'resultado');
        }
        if (execFields.investimento) {
          xml = applyProportionalSizing(xml, execFields.investimento, 'investimento');
        }
        if (execFields.vpl) {
          xml = applyProportionalSizing(xml, execFields.vpl, 'vpl');
        }
        if (execFields.roi) {
          xml = applyProportionalSizing(xml, execFields.roi, 'roi');
        }
        if (execFields.tir) {
          xml = applyProportionalSizing(xml, execFields.tir, 'tir');
        }
        if (execFields.payback_simples) {
          xml = applyProportionalSizing(xml, execFields.payback_simples, 'payback');
        }
        if (execFields.payback_descontado) {
          xml = applyProportionalSizing(xml, execFields.payback_descontado, 'payback');
        }
        if (execFields.descricao_hipotese) {
          xml = applyProportionalSizing(xml, execFields.descricao_hipotese, 'descricao_hip');
        }
        if (execFields.descricao_problema) {
          xml = applyProportionalSizing(xml, execFields.descricao_problema, 'descricao_prob');
        }
      } else if (isExec && (p.agent.layout_id === 'er-cover' || p.agent.layout_id === 'er-prototype')) {
        // ══════ COVER & PROTOTYPE — Proportional Intelligence ══════
        const catEntry = getExecSlideByLayoutId(p.agent.layout_id);
        if (catEntry) {
          let fields = p.agent.fields || {};
          if (p.agent.layout_id === 'er-cover' && (!fields.client || !fields.title)) {
            fields = {
              title: fields.title || 'Relatório Executivo',
              client: fields.client || p.agent.title || title || '',
              experience: fields.experience || p.agent.subtitle || '',
            };
          }

          // Proportional truncation — analyze text vs box capacity
          if (p.agent.layout_id === 'er-cover') {
            const clientSpec = EXEC_TEXT_SPECS['cover_client'];
            const expSpec = EXEC_TEXT_SPECS['cover_experience'];
            fields = {
              ...fields,
              client: (fields.client || '').substring(0, clientSpec.charsPerLine * clientSpec.maxLines),
              experience: (fields.experience || '').substring(0, expSpec.charsPerLine * expSpec.maxLines),
            };
          }

          xml = applyFieldReplacements(xml, { ...p.agent, fields }, catEntry.fields);

          // Cover: apply proportional sizing
          if (p.agent.layout_id === 'er-cover') {
            const clientText = fields.client || '';
            const expText = fields.experience || '';
            if (clientText) xml = applyProportionalSizing(xml, clientText, 'cover_client');
            if (expText) xml = applyProportionalSizing(xml, expText, 'cover_experience');
          }
        }
      } else if (isBusinessCase) {
        // ══════ BUSINESS CASE — Field Replacement + Proportional Intelligence ══════
        xml = applyBusinessCaseReplacements(xml, p.agent, p.agent.layout_id!);

        // Apply proportional sizing to each replaced field (like a human designer)
        const bcFields = p.agent.fields || {};
        const bcLayoutId = p.agent.layout_id!;

        for (const [fieldId, value] of Object.entries(bcFields)) {
          if (!value || typeof value !== 'string' || value.trim().length === 0) continue;

          // Try exact match first: "bc-cover.title"
          let specKey = `${bcLayoutId}.${fieldId}`;

          // Pattern-based matching for numbered fields (section1_heading → section_heading)
          if (!BC_TEXT_SPECS[specKey]) {
            let resolved = '';
            if (fieldId.match(/^section\d+_heading$/)) resolved = `${bcLayoutId}.section_heading`;
            else if (fieldId.match(/^section\d+_body$/)) resolved = `${bcLayoutId}.section_body`;
            else if (fieldId.match(/^impact\d+_value$/)) resolved = `${bcLayoutId}.impact_value`;
            else if (fieldId.match(/^impact\d+_label$/)) resolved = `${bcLayoutId}.impact_label`;
            else if (fieldId.match(/^impact\d+_detail$/)) resolved = `${bcLayoutId}.impact_detail`;
            else if (fieldId.match(/^benefit\d+_heading$/)) resolved = `${bcLayoutId}.benefit_heading`;
            else if (fieldId.match(/^benefit\d+_value$/)) resolved = `${bcLayoutId}.benefit_value`;
            else if (fieldId.match(/^benefit\d+_label$/)) resolved = `${bcLayoutId}.benefit_label`;
            else if (fieldId.match(/^highlight\d+_value$/)) resolved = `${bcLayoutId}.highlight_value`;
            else if (fieldId.match(/^highlight\d+_label$/)) resolved = `${bcLayoutId}.highlight_label`;
            if (resolved && BC_TEXT_SPECS[resolved]) specKey = resolved;
          }

          if (BC_TEXT_SPECS[specKey]) {
            xml = applyProportionalSizing(xml, value, specKey);

            // Special: Cover title has extreme line spacing (122.5pt) that must
            // scale down with font reduction to prevent vertical overflow
            if (specKey === 'bc-cover.title') {
              const spec = BC_TEXT_SPECS[specKey];
              const fit = calcProportionalFit(value, specKey);
              if (fit.shouldApply) {
                xml = adjustLineSpacingForText(xml, value, spec.origFontPt, fit.fontPt);
              }
            }

            // Special: Cover subtitle with wrap=none overflows if text > 45 chars
            // → enable wrapping and add normAutofit as safety net
            if (specKey === 'bc-cover.subtitle' && value.length > 45) {
              xml = enableWrapForText(xml, value);
            }
          }
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
