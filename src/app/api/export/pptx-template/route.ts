// ============================================
// DeckForge — Template-Based PPTX Export (server-side)
// Clones an uploaded PPTX template and replaces
// placeholder text with AI-generated content.
// Preserves ALL formatting, fonts, colors, images, layouts.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

// --- Types ---

interface ExecData {
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
}

interface SlideData {
  order: number;
  title: string;
  subtitle?: string;
  bullets: string[];
  speakerNotes: string;
  layoutType: string;
  execData?: ExecData;
}

interface TemplateExportRequest {
  templateBase64: string; // Raw PPTX binary as base64
  slides: SlideData[];
  title: string;
  subtitle?: string;
}

// --- Placeholder Map for Slide 2 (Exec Report) ---
// Maps placeholder text found in the template XML → field in execData
// Each entry: [textToFind, fieldInExecData]

function buildReplacementMap(d: ExecData): [string, string][] {
  return [
    // Problem & Hypothesis
    ['[PROBLEMA]', d.problema],
    ['Hipótese testada:', `Hipótese testada: ${d.hipotese}`],

    // Solution results (bullets inside orange box)
    ['[Resultado chave tangivel esperado]', d.resultadoTangivel],
    ['[Resultado chave intangivel esperado e benefícios]', d.resultadoIntangivel],

    // Objective
    ['[Objetivo]', d.objetivo],

    // Impact percentages (right side bars)
    // The template has fixed labels "Aumento receita", "Redução de custo", "Eficiência operacional"
    // We replace the percentage values next to them
    // Note: these appear as separate <a:t> tags, so we replace the exact value
  ];
}

// Values that appear as separate text runs — we replace by matching the pattern
function buildValueReplacements(d: ExecData, slideIndex: number): [RegExp, string][] {
  // For the first exec-report slide, replace the first occurrence of each pattern
  // For subsequent slides, we've already duplicated the slide XML
  return [
    // Impact bar percentages (order matters: they appear as 75%, 7%, 6% in the template)
    // We'll handle these via indexed replacement in the actual XML
  ];
}

/**
 * Replace text content inside <a:t> tags within PPTX slide XML.
 * Handles the case where text might be split across multiple runs.
 */
function replaceTextInXml(xml: string, oldText: string, newText: string): string {
  // Escape special XML characters in the replacement
  const safeNew = newText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Strategy 1: Direct replacement within <a:t> tags
  // Find <a:t>oldText</a:t> and replace with <a:t>newText</a:t>
  const escapedOld = oldText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Regex escape

  const directPattern = new RegExp(
    `(<a:t[^>]*>)${escapedOld}(</a:t>)`,
    'g'
  );

  let result = xml.replace(directPattern, `$1${safeNew}$2`);

  // Strategy 2: Also try without XML escaping (some tags have plain text)
  if (result === xml && !oldText.includes('&')) {
    const plainPattern = new RegExp(
      `(<a:t[^>]*>)${oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(</a:t>)`,
      'g'
    );
    result = xml.replace(plainPattern, `$1${safeNew}$2`);
  }

  return result;
}

/**
 * Extract all text content from <a:t> tags in a slide XML.
 * Returns array of { text, index } sorted by position in XML.
 */
function extractTextRuns(xml: string): { text: string; startIndex: number }[] {
  const runs: { text: string; startIndex: number }[] = [];
  const pattern = /<a:t[^>]*>([^<]*)<\/a:t>/g;
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    const text = match[1].trim();
    if (text.length > 0) {
      runs.push({ text, startIndex: match.index });
    }
  }
  return runs;
}

/**
 * Smart generic text replacement for content/two-column/quote/closing slides.
 * Analyzes existing text blocks and replaces them intelligently:
 * - Longest text block → title
 * - Second longest → subtitle (if available)
 * - Remaining → bullets (matched by position)
 */
function applyGenericSlideReplacements(xml: string, slide: SlideData): string {
  let result = xml;
  const runs = extractTextRuns(xml);

  if (runs.length === 0) return result;

  // Sort by text length descending to find the "most important" texts
  const sortedByLength = [...runs].sort((a, b) => b.text.length - a.text.length);

  // Strategy: identify title, subtitle, and body text
  // Title = first large text OR first text in document order among the top 2 longest
  // Subtitle = second significant text
  // Body bullets = remaining texts

  // Find title candidate (longest text that appears early in the slide)
  const titleCandidate = sortedByLength[0];
  if (titleCandidate && slide.title) {
    result = replaceTextInXml(result, titleCandidate.text, slide.title);
  }

  // Find subtitle candidate (second longest, if we have a subtitle)
  if (sortedByLength.length > 1 && slide.subtitle) {
    result = replaceTextInXml(result, sortedByLength[1].text, slide.subtitle);
  }

  // For bullet replacement: find remaining text runs (not title/subtitle) in document order
  const usedTexts = new Set<string>();
  if (titleCandidate) usedTexts.add(titleCandidate.text);
  if (sortedByLength.length > 1 && slide.subtitle) usedTexts.add(sortedByLength[1].text);

  const remainingRuns = runs.filter((r) => !usedTexts.has(r.text));

  // Replace remaining text runs with bullets (in order)
  for (let i = 0; i < Math.min(slide.bullets.length, remainingRuns.length); i++) {
    result = replaceTextInXml(result, remainingRuns[i].text, slide.bullets[i]);
  }

  return result;
}

/**
 * Replace the Nth occurrence of a text pattern in <a:t> tags.
 * Used for values like "R$x", "X%", "75%" that appear multiple times.
 */
function replaceNthTextInXml(xml: string, oldText: string, newText: string, n: number): string {
  const safeNew = newText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const escapedOld = oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(<a:t[^>]*>)${escapedOld}(</a:t>)`, 'g');

  let count = 0;
  return xml.replace(pattern, (match, p1, p2) => {
    count++;
    if (count === n) {
      return `${p1}${safeNew}${p2}`;
    }
    return match;
  });
}

/**
 * Apply all exec-report replacements to a slide XML.
 */
function applyExecReplacements(xml: string, d: ExecData): string {
  let result = xml;

  // Text replacements (preserves all formatting around the <a:t> tags)
  const textReplacements = buildReplacementMap(d);
  for (const [oldText, newText] of textReplacements) {
    result = replaceTextInXml(result, oldText, newText);
  }

  // Impact percentages (appear as standalone values: "75%", "7%", "6%")
  result = replaceNthTextInXml(result, '75%', d.aumentoReceita, 1);
  result = replaceNthTextInXml(result, '7%', d.reducaoCusto, 1);
  result = replaceNthTextInXml(result, '6%', d.eficienciaOperacional, 1);

  // Financial values: R$x appears twice (Investimento total, VPL)
  result = replaceNthTextInXml(result, 'R$x', d.investimentoTotal, 1);
  result = replaceNthTextInXml(result, 'R$x', d.vpl, 1); // second occurrence

  // ROI: "X%" appears once for ROI acumulado (first occurrence)
  result = replaceNthTextInXml(result, 'X%', d.roiAcumulado, 1);

  // TIR: "X% a.a" — single text run
  result = replaceTextInXml(result, 'X% a.a', d.tir);

  // Payback values: "Não atingido / atingido " appears twice
  result = replaceNthTextInXml(result, 'Não atingido / atingido ', d.paybackSimples + ' ', 1);
  result = replaceNthTextInXml(result, 'Não atingido / atingido ', d.paybackDescontado + ' ', 1);

  // Solution description: replace "[ ]" with solution text
  result = replaceTextInXml(result, '[ ]', d.solucao);

  // Summary line at bottom
  result = replaceTextInXml(
    result,
    'Problema – hipotese + resultado chave/ beneficios – solução – business case ',
    `${d.problema} – ${d.hipotese}`
  );

  return result;
}

/**
 * Apply title slide replacements.
 */
function applyTitleReplacements(xml: string, title: string): string {
  // The title slide has: "Relatório ExecutivoFrontier FirmsU Experience"
  // Split by the pipe-separated format from the original
  // We replace the full concatenated text
  let result = xml;

  // Replace the title text run — find the paragraph containing "Relatório Executivo"
  // and replace the whole content
  const titlePattern = /(<a:t[^>]*>)(Relatório Executivo[\s\S]*?U Experience)(<\/a:t>)/;
  const match = result.match(titlePattern);
  if (match) {
    const safeTitle = title
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    result = result.replace(titlePattern, `$1${safeTitle}$3`);
  } else {
    // Fallback: try individual text runs
    result = replaceTextInXml(result, 'Frontier Firms', title.split('|')[1]?.trim() || title);
    result = replaceTextInXml(result, 'U Experience', title.split('|')[2]?.trim() || '');
  }

  return result;
}

/**
 * Duplicate a slide in the PPTX zip.
 * Copies the slide XML, relationships, and registers in presentation.xml.
 */
async function duplicateSlide(
  zip: JSZip,
  sourceSlideNum: number,
  newSlideNum: number,
): Promise<void> {
  // Copy slide XML
  const srcPath = `ppt/slides/slide${sourceSlideNum}.xml`;
  const dstPath = `ppt/slides/slide${newSlideNum}.xml`;
  const srcXml = await zip.file(srcPath)!.async('string');
  zip.file(dstPath, srcXml);

  // Copy slide relationships
  const srcRelsPath = `ppt/slides/_rels/slide${sourceSlideNum}.xml.rels`;
  const dstRelsPath = `ppt/slides/_rels/slide${newSlideNum}.xml.rels`;
  if (zip.file(srcRelsPath)) {
    const srcRels = await zip.file(srcRelsPath)!.async('string');
    // Update relationship targets that reference slide-specific files
    const newRels = srcRels.replace(
      /notesSlide\d+/g,
      `notesSlide${newSlideNum}`
    );
    zip.file(dstRelsPath, newRels);
  }

  // Register new slide in presentation.xml
  const presXml = await zip.file('ppt/presentation.xml')!.async('string');

  // Find the slide reference pattern for the source slide
  // Add a new <p:sldId> entry and <p:sldIdLst> reference
  // Also need to add to [Content_Types].xml

  // Add to [Content_Types].xml
  const ctXml = await zip.file('[Content_Types].xml')!.async('string');
  if (!ctXml.includes(`/ppt/slides/slide${newSlideNum}.xml`)) {
    const newOverride = `<Override PartName="/ppt/slides/slide${newSlideNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    const updatedCt = ctXml.replace('</Types>', `${newOverride}\n</Types>`);
    zip.file('[Content_Types].xml', updatedCt);
  }

  // Add relationship in ppt/_rels/presentation.xml.rels
  const presRelsPath = 'ppt/_rels/presentation.xml.rels';
  if (zip.file(presRelsPath)) {
    let presRels = await zip.file(presRelsPath)!.async('string');
    // Find highest rId
    const rIdMatches = Array.from(presRels.matchAll(/rId(\d+)/g));
    const maxRId = Math.max(...rIdMatches.map((m) => parseInt(m[1])));
    const newRId = `rId${maxRId + 1}`;

    // Add new relationship
    const newRel = `<Relationship Id="${newRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${newSlideNum}.xml"/>`;
    presRels = presRels.replace('</Relationships>', `${newRel}\n</Relationships>`);
    zip.file(presRelsPath, presRels);

    // Add slide reference in presentation.xml
    // Find the highest sldId
    const sldIdMatches = Array.from(presXml.matchAll(/id="(\d+)"/g));
    const maxSldId = Math.max(...sldIdMatches.map((m) => parseInt(m[1])), 256);
    const newSldId = maxSldId + 1;

    // Insert new sldId after the source slide's entry
    const srcRIdMatch = presRels.match(
      new RegExp(`Id="(rId\\d+)"[^>]*Target="slides/slide${sourceSlideNum}\\.xml"`)
    );
    if (srcRIdMatch) {
      const srcRId = srcRIdMatch[1];
      // Find the sldId entry for the source and add after it
      const sldIdEntry = `<p:sldId id="${newSldId}" r:id="${newRId}"/>`;
      const updatedPres = presXml.replace(
        new RegExp(`(<p:sldId[^/]*r:id="${srcRId}"[^/]*/>)`),
        `$1\n      ${sldIdEntry}`
      );
      zip.file('ppt/presentation.xml', updatedPres);
    }
  }
}

// --- Main Handler ---

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TemplateExportRequest;
    const { templateBase64, slides, title } = body;

    if (!templateBase64) {
      return NextResponse.json(
        { error: 'templateBase64 is required — upload a PPTX template first' },
        { status: 400 }
      );
    }

    // Load the template PPTX
    const templateBuffer = Buffer.from(templateBase64, 'base64');
    const zip = await JSZip.loadAsync(templateBuffer);

    // Identify exec-report slides from the input
    const execSlides = slides.filter((s) => s.layoutType === 'exec-report' && s.execData);
    const titleSlide = slides.find((s) => s.layoutType === 'title');

    // Count template slides
    const templateSlideFiles = Object.keys(zip.files)
      .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/)![1]);
        const numB = parseInt(b.match(/slide(\d+)/)![1]);
        return numA - numB;
      });
    const totalTemplateSlides = templateSlideFiles.length;

    console.log(`[Template Export] Template has ${totalTemplateSlides} slides, agent produced ${slides.length} slides (${execSlides.length} exec-report)`);

    // --- Step 1: Update title slide (slide 1) — ALWAYS preserve cover design ---
    if (titleSlide && zip.file('ppt/slides/slide1.xml')) {
      let xml1 = await zip.file('ppt/slides/slide1.xml')!.async('string');
      // Smart title injection: replace the largest text block with the new title
      xml1 = applyGenericSlideReplacements(xml1, {
        order: 0,
        title: titleSlide.title || title,
        subtitle: titleSlide.subtitle,
        bullets: titleSlide.bullets || [],
        speakerNotes: titleSlide.speakerNotes || '',
        layoutType: 'title',
      });
      zip.file('ppt/slides/slide1.xml', xml1);
    }

    // --- Step 2: Handle exec-report slides ---
    // The template has slide 2 as the exec-report template.
    // For the FIRST exec case, we replace slide 2 in-place.
    // For additional cases, we DUPLICATE slide 2 as slide 3, 4, etc.
    // (pushing original slide 3+ further down)

    if (execSlides.length > 0 && zip.file('ppt/slides/slide2.xml')) {
      const templateSlideXml = await zip.file('ppt/slides/slide2.xml')!.async('string');

      // Find total slides in the template
      const existingSlides = Object.keys(zip.files)
        .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
        .length;

      // For extra exec slides (beyond the first), duplicate template slide
      for (let i = 1; i < execSlides.length; i++) {
        const newNum = existingSlides + i;
        await duplicateSlide(zip, 2, newNum);
      }

      // Apply replacements to the first exec slide (slide 2)
      let xml2 = templateSlideXml;
      xml2 = applyExecReplacements(xml2, execSlides[0].execData!);
      zip.file('ppt/slides/slide2.xml', xml2);

      // Apply replacements to duplicated exec slides
      for (let i = 1; i < execSlides.length; i++) {
        const slideNum = existingSlides + i;
        const slidePath = `ppt/slides/slide${slideNum}.xml`;
        // Start from fresh template XML (not the already-modified slide 2)
        let xmlN = templateSlideXml;
        xmlN = applyExecReplacements(xmlN, execSlides[i].execData!);
        zip.file(slidePath, xmlN);
      }
    }

    // --- Step 3: Handle ALL remaining template slides generically ---
    // For each template slide not yet handled, find the corresponding agent slide and replace text
    const handledTemplateSlideNums = new Set<number>();
    handledTemplateSlideNums.add(1); // title slide already handled

    // Mark exec-report slides as handled
    if (execSlides.length > 0 && zip.file('ppt/slides/slide2.xml')) {
      handledTemplateSlideNums.add(2);
      // Also mark duplicated slides
      for (let i = 1; i < execSlides.length; i++) {
        handledTemplateSlideNums.add(totalTemplateSlides + i);
      }
    }

    // Get non-title, non-exec agent slides in order
    const genericAgentSlides = slides.filter(
      (s) => s.layoutType !== 'title' && s.layoutType !== 'exec-report'
    );

    // Map generic agent slides to remaining template slides
    let genericIdx = 0;
    for (const slideFile of templateSlideFiles) {
      const slideNum = parseInt(slideFile.match(/slide(\d+)/)![1]);
      if (handledTemplateSlideNums.has(slideNum)) continue;
      if (genericIdx >= genericAgentSlides.length) break;

      const agentSlide = genericAgentSlides[genericIdx];
      genericIdx++;

      try {
        let xml = await zip.file(slideFile)!.async('string');
        xml = applyGenericSlideReplacements(xml, agentSlide);

        // Also add speaker notes if available
        if (agentSlide.speakerNotes) {
          // Check if notes XML already exists or inject into slide
          const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`;
          if (zip.file(notesPath)) {
            let notesXml = await zip.file(notesPath)!.async('string');
            // Replace placeholder notes text
            const notesRuns = extractTextRuns(notesXml);
            if (notesRuns.length > 0) {
              notesXml = replaceTextInXml(notesXml, notesRuns[0].text, agentSlide.speakerNotes);
            }
            zip.file(notesPath, notesXml);
          }
        }

        zip.file(slideFile, xml);
        console.log(`[Template Export] Slide ${slideNum}: replaced with "${agentSlide.title}" (${agentSlide.layoutType})`);
      } catch (err) {
        console.error(`[Template Export] Error processing slide ${slideNum}:`, err);
      }
    }

    // --- Step 4: Generate output PPTX ---
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
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${fileName}.pptx"`,
      },
    });
  } catch (err: any) {
    console.error('[Template PPTX Export] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate template PPTX' },
      { status: 500 },
    );
  }
}
