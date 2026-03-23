// ============================================
// DeckForge — PPTX Template Parser
// Extracts text, structure, and images from
// uploaded .pptx files for use as reference
// ============================================

import JSZip from 'jszip';

export interface ParsedSlide {
  index: number;
  texts: string[];
  notes: string;
}

export interface ParsedPptx {
  /** Extracted slide content (text + notes) */
  slides: ParsedSlide[];
  /** Extracted images as base64 data URLs */
  images: { name: string; dataUrl: string; mimeType: string }[];
  /** Full text summary for agent reference */
  textSummary: string;
  /** Number of slides found */
  slideCount: number;
}

/**
 * Parse a PPTX file (ArrayBuffer) and extract slides, text, and images.
 * PPTX is a ZIP containing XML (ppt/slides/slideN.xml) and media (ppt/media/*).
 */
export async function parsePptxFile(buffer: ArrayBuffer): Promise<ParsedPptx> {
  const zip = await JSZip.loadAsync(buffer);

  // --- Extract slide text ---
  const slides: ParsedSlide[] = [];
  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/i)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)/i)?.[1] || '0');
      return numA - numB;
    });

  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async('text');
    const texts = extractTextsFromXml(xml);

    // Try to get slide notes
    const noteFile = `ppt/notesSlides/notesSlide${i + 1}.xml`;
    let notes = '';
    if (zip.files[noteFile]) {
      const noteXml = await zip.files[noteFile].async('text');
      const noteTexts = extractTextsFromXml(noteXml);
      // Filter out common placeholder texts
      notes = noteTexts
        .filter((t) => !t.match(/^\d+$/) && t.length > 2)
        .join(' ');
    }

    slides.push({ index: i, texts, notes });
  }

  // --- Extract images ---
  const images: ParsedPptx['images'] = [];
  const mediaFiles = Object.keys(zip.files).filter(
    (f) => /^ppt\/media\//i.test(f) && /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff)$/i.test(f)
  );

  for (const mediaPath of mediaFiles) {
    try {
      const data = await zip.files[mediaPath].async('base64');
      const ext = mediaPath.split('.').pop()?.toLowerCase() || 'png';
      const mimeMap: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        bmp: 'image/bmp',
        tiff: 'image/tiff',
      };
      const mimeType = mimeMap[ext] || 'image/png';
      const name = mediaPath.split('/').pop() || `image-${images.length}.${ext}`;
      images.push({
        name,
        dataUrl: `data:${mimeType};base64,${data}`,
        mimeType,
      });
    } catch {
      // Skip unreadable images
    }
  }

  // --- Build text summary ---
  const textParts: string[] = [];
  for (const slide of slides) {
    const slideText = slide.texts.filter((t) => t.trim().length > 0);
    if (slideText.length > 0) {
      textParts.push(`[Slide ${slide.index + 1}]\n${slideText.join('\n')}`);
      if (slide.notes) {
        textParts.push(`  [Notes] ${slide.notes}`);
      }
    }
  }

  return {
    slides,
    images,
    textSummary: textParts.join('\n\n'),
    slideCount: slides.length,
  };
}

/**
 * Extract all text runs from PPTX XML.
 * Looks for <a:t> tags which contain the actual text content.
 */
function extractTextsFromXml(xml: string): string[] {
  const texts: string[] = [];

  // Match all <a:t>...</a:t> tags (text runs in OOXML)
  const textRegex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  let match: RegExpExecArray | null;

  // Group by paragraph: <a:p> ... </a:p>
  const paragraphs = xml.split(/<\/a:p>/);
  for (const para of paragraphs) {
    const runs: string[] = [];
    textRegex.lastIndex = 0;
    while ((match = textRegex.exec(para)) !== null) {
      const text = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#xD;/g, '')
        .trim();
      if (text) runs.push(text);
    }
    if (runs.length > 0) {
      texts.push(runs.join(''));
    }
  }

  return texts.filter((t) => t.trim().length > 0);
}
